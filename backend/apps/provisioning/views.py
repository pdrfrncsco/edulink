from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import (
    IsPlatformAdminOrSchoolSecretary,
    TenantScopedMixin,
    get_user_profile,
    is_platform_admin,
)
from apps.tenants.models import CloudIntegration, School
from .models import ProvisioningLog
from .serializers import ProvisioningLogSerializer
from .services.base import ProvisioningError
from .tasks import build_provisioner, sync_school_batch_task, sync_user_to_cloud_task


def _ensure_school_access(request_user, target_school_id) -> None:
    if is_platform_admin(request_user):
        return
    profile = get_user_profile(request_user)
    if not profile or not profile.school_id or str(profile.school_id) != str(target_school_id):
        raise PermissionDenied('Não tem permissão para operar noutra instituição.')


class TriggerBatchSyncAPIView(APIView):
    """Dispara a sincronização assíncrona em massa para todos os membros da escola."""
    permission_classes = [IsPlatformAdminOrSchoolSecretary]

    def post(self, request, school_id):
        _ensure_school_access(request.user, school_id)
        school = School.objects.filter(id=school_id).first()
        if not school:
            return Response({'detail': 'Escola não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        CloudIntegration.objects.filter(school=school, sync_enabled=True).update(
            sync_status=CloudIntegration.SyncStatus.SYNCING
        )
        task = sync_school_batch_task.delay(school_id=str(school.id))
        return Response({
            'message': f'Sincronização em segundo plano iniciada para {school.name}.',
            'task_id': str(task.id),
        }, status=status.HTTP_202_ACCEPTED)


class TriggerUserSyncAPIView(APIView):
    """Dispara a sincronização de um utilizador específico."""
    permission_classes = [IsPlatformAdminOrSchoolSecretary]

    def post(self, request, user_id):
        from apps.directory.models import AcademicUser
        user = AcademicUser.objects.filter(id=user_id).first()
        if not user:
            return Response({'detail': 'Utilizador não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        _ensure_school_access(request.user, user.school_id)
        task = sync_user_to_cloud_task.delay(user_id=str(user.id), school_id=str(user.school_id))
        return Response({
            'message': f'Sincronização iniciada para {user.institutional_email}.',
            'task_id': str(task.id),
        }, status=status.HTTP_202_ACCEPTED)


class TestCloudIntegrationAPIView(APIView):
    """
    Testa imediatamente as credenciais encriptadas de uma CloudIntegration
    contra a Google Directory API ou Microsoft Graph API.
    """
    permission_classes = [IsPlatformAdminOrSchoolSecretary]

    def post(self, request, integration_id):
        integration = CloudIntegration.objects.select_related('school').filter(id=integration_id).first()
        if not integration:
            return Response({'detail': 'Integração de nuvem não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        _ensure_school_access(request.user, integration.school_id)
        school = integration.school
        try:
            provisioner = build_provisioner(integration, school)
            if integration.provider == CloudIntegration.Provider.GOOGLE:
                info = provisioner.verify_connection(domain=school.domain)
            else:
                info = provisioner.verify_connection()

            integration.sync_status = CloudIntegration.SyncStatus.SUCCESS
            integration.last_sync_at = timezone.now()
            integration.last_error_message = ''
            integration.save(update_fields=['sync_status', 'last_sync_at', 'last_error_message'])

            log_status = (
                ProvisioningLog.Status.SANDBOX
                if info.get('status') == 'SANDBOX'
                else ProvisioningLog.Status.SUCCESS
            )
            ProvisioningLog.objects.create(
                school=school,
                provider=integration.provider,
                action=ProvisioningLog.Action.TEST,
                status=log_status,
                detail=str(info),
            )
            return Response({'ok': True, 'integration_id': str(integration.id), 'details': info})
        except ProvisioningError as exc:
            integration.sync_status = CloudIntegration.SyncStatus.ERROR
            integration.last_error_message = str(exc)
            integration.save(update_fields=['sync_status', 'last_error_message'])
            ProvisioningLog.objects.create(
                school=school,
                provider=integration.provider,
                action=ProvisioningLog.Action.TEST,
                status=ProvisioningLog.Status.FAILED,
                detail=str(exc),
            )
            return Response(
                {'ok': False, 'error': str(exc), 'retryable': exc.retryable},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ProvisioningLogViewSet(TenantScopedMixin, viewsets.ReadOnlyModelViewSet):
    """Histórico auditável de operações de provisionamento isolado por escola."""
    queryset = ProvisioningLog.objects.select_related('school', 'user').all()
    serializer_class = ProvisioningLogSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    filterset_fields = ['school', 'provider', 'action', 'status']
    search_fields = ['user__institutional_email', 'school__domain', 'external_id']
