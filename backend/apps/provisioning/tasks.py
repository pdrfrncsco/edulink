import logging
from celery import shared_task
from django.utils import timezone

from apps.provisioning.services.base import ProvisioningError
from apps.provisioning.services.google_service import GoogleWorkspaceProvisioner
from apps.provisioning.services.microsoft_service import Microsoft365Provisioner

logger = logging.getLogger(__name__)


def build_provisioner(integration, school):
    """Instancia o conector adequado (Google ou Microsoft) a partir das credenciais encriptadas."""
    creds = integration.get_credentials()
    if not isinstance(creds, dict):
        creds = {}

    if integration.provider == integration.Provider.GOOGLE:
        return GoogleWorkspaceProvisioner(
            service_account_info=creds,
            admin_email=f"admin@{school.domain}",
        )
    if integration.provider == integration.Provider.MICROSOFT:
        return Microsoft365Provisioner.from_credentials(creds)
    raise ValueError(f"Provedor não suportado: {integration.provider}")


def _record_log(school, user, provider: str, action: str, result: dict | None = None, error: str = ''):
    from apps.provisioning.models import ProvisioningLog

    if error:
        status = ProvisioningLog.Status.FAILED
        external_id = ''
        detail = error
    else:
        is_sandbox = bool(result and result.get('sandbox'))
        status = ProvisioningLog.Status.SANDBOX if is_sandbox else ProvisioningLog.Status.SUCCESS
        external_id = (result or {}).get('external_id', '')
        detail = str(result or '')

    ProvisioningLog.objects.create(
        school=school,
        user=user,
        provider=provider,
        action=action,
        status=status,
        external_id=external_id,
        detail=detail,
    )


def _sync_single_provider(integration, school, user) -> dict:
    from apps.directory.models import AcademicUser
    from apps.provisioning.models import ProvisioningLog

    provisioner = build_provisioner(integration, school)
    if integration.provider == integration.Provider.GOOGLE:
        org_unit = '/Docentes' if user.role == AcademicUser.Role.TEACHER else '/Alunos'
        result = provisioner.provision_user(
            full_name=user.full_name,
            institutional_email=user.institutional_email,
            org_unit=org_unit,
            external_id=user.external_google_id,
        )
        if result.get('external_id'):
            user.external_google_id = result['external_id']
            user.save(update_fields=['external_google_id'])
    else:
        result = provisioner.provision_user(
            full_name=user.full_name,
            institutional_email=user.institutional_email,
            is_faculty=(user.role == AcademicUser.Role.TEACHER),
            external_id=user.external_ms_id,
        )
        if result.get('external_id'):
            user.external_ms_id = result['external_id']
            user.save(update_fields=['external_ms_id'])

    action = (
        ProvisioningLog.Action.REACTIVATE
        if result.get('status') == 'REACTIVATED'
        else ProvisioningLog.Action.PROVISION
    )
    _record_log(school, user, integration.provider, action, result=result)
    return result


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def sync_user_to_cloud_task(self, user_id: str, school_id: str):
    """
    Worker assíncrono para provisionar ou reativar um utilizador
    no Google Workspace e/ou Microsoft 365.
    """
    from apps.directory.models import AcademicUser
    from apps.provisioning.models import ProvisioningLog
    from apps.tenants.models import CloudIntegration, School

    user = AcademicUser.objects.filter(id=user_id, school_id=school_id).first()
    if not user:
        logger.warning("Utilizador %s não encontrado para provisionamento.", user_id)
        return False

    school = School.objects.get(id=school_id)
    integrations = CloudIntegration.objects.filter(school=school, sync_enabled=True)

    for integration in integrations:
        try:
            _sync_single_provider(integration, school, user)
            integration.last_sync_at = timezone.now()
            integration.sync_status = CloudIntegration.SyncStatus.SUCCESS
            integration.last_error_message = ''
            integration.save(update_fields=['last_sync_at', 'sync_status', 'last_error_message'])
        except ProvisioningError as exc:
            logger.error("Erro %s ao provisionar %s: %s", exc.provider, user.institutional_email, exc)
            integration.sync_status = CloudIntegration.SyncStatus.ERROR
            integration.last_error_message = str(exc)
            integration.save(update_fields=['sync_status', 'last_error_message'])
            _record_log(school, user, integration.provider, ProvisioningLog.Action.PROVISION, error=str(exc))
            if exc.retryable:
                raise self.retry(exc=exc)
        except Exception as exc:
            logger.exception("Erro inesperado ao provisionar %s", user_id)
            integration.sync_status = CloudIntegration.SyncStatus.ERROR
            integration.last_error_message = str(exc)
            integration.save(update_fields=['sync_status', 'last_error_message'])
            _record_log(school, user, integration.provider, ProvisioningLog.Action.PROVISION, error=str(exc))
            raise self.retry(exc=exc)

    logger.info("Utilizador %s provisionado com sucesso na nuvem.", user.institutional_email)
    return True


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def revoke_user_cloud_access_task(self, user_id: str, school_id: str, reason: str = ''):
    """
    Worker assíncrono disparado quando a matrícula passa para SUSPENDED.
    Suspende imediatamente o acesso do utilizador no Google e no Microsoft Entra ID.
    """
    from apps.directory.models import AcademicUser
    from apps.provisioning.models import ProvisioningLog
    from apps.tenants.models import CloudIntegration, School

    user = AcademicUser.objects.filter(id=user_id, school_id=school_id).first()
    if not user:
        logger.warning("Utilizador %s não encontrado para revogação.", user_id)
        return False

    school = School.objects.get(id=school_id)
    integrations = CloudIntegration.objects.filter(school=school, sync_enabled=True)

    for integration in integrations:
        try:
            provisioner = build_provisioner(integration, school)
            external_id = (
                user.external_google_id
                if integration.provider == CloudIntegration.Provider.GOOGLE
                else user.external_ms_id
            )
            result = provisioner.suspend_user(user.institutional_email, external_id=external_id)
            _record_log(school, user, integration.provider, ProvisioningLog.Action.SUSPEND, result=result)
        except ProvisioningError as exc:
            logger.error("Erro %s ao revogar %s: %s", exc.provider, user.institutional_email, exc)
            _record_log(school, user, integration.provider, ProvisioningLog.Action.SUSPEND, error=str(exc))
            if exc.retryable:
                raise self.retry(exc=exc)

    user.is_active = False
    user.save(update_fields=['is_active'])

    try:
        from apps.accounts.services.keycloak_service import KeycloakAdminService, KeycloakSyncError
        kc = KeycloakAdminService()
        if not kc.is_sandbox:
            kc.disable_user(user.institutional_email)
    except Exception as exc:
        logger.warning("Aviso ao desativar %s no Keycloak SSO: %s", user.institutional_email, exc)

    logger.info("Acessos em nuvem de %s REVOGADOS. Motivo: %s", user.institutional_email, reason)
    return True


@shared_task
def sync_school_batch_task(school_id: str):
    """Worker para sincronização em massa de todos os alunos e professores ativos."""
    from apps.directory.models import AcademicUser

    users = list(AcademicUser.objects.filter(school_id=school_id, is_active=True).values_list('id', flat=True))
    for u_id in users:
        sync_user_to_cloud_task.delay(user_id=str(u_id), school_id=school_id)
    return len(users)
