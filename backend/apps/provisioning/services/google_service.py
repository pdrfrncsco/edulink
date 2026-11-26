import logging
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from .base import ProvisioningError, generate_temporary_password, split_full_name

logger = logging.getLogger(__name__)

GOOGLE_ADMIN_SCOPES = [
    'https://www.googleapis.com/auth/admin.directory.user',
    'https://www.googleapis.com/auth/admin.directory.orgunit',
]


class GoogleWorkspaceProvisioner:
    """
    Conector real de integração com o Google Workspace for Education
    utilizando Google Admin SDK (Directory API) via Service Account
    com Domain-Wide Delegation.
    """

    def __init__(self, service_account_info: dict, admin_email: str, customer_id: str = 'my_customer'):
        self.service_account_info = service_account_info or {}
        self.admin_email = self.service_account_info.get('delegated_admin_email') or admin_email
        self.customer_id = self.service_account_info.get('customer_id') or customer_id
        self.is_sandbox = bool(
            self.service_account_info.get('sandbox')
            or not (
                self.service_account_info.get('private_key')
                and self.service_account_info.get('client_email')
            )
        )
        self._service = None

    def _get_service(self):
        if self._service is not None:
            return self._service

        try:
            credentials = service_account.Credentials.from_service_account_info(
                self.service_account_info,
                scopes=GOOGLE_ADMIN_SCOPES,
                subject=self.admin_email,
            )
            self._service = build(
                'admin',
                'directory_v1',
                credentials=credentials,
                cache_discovery=False,
            )
            return self._service
        except Exception as exc:
            raise ProvisioningError(
                f"Falha ao inicializar credenciais Google Service Account: {exc}",
                provider='GOOGLE',
                retryable=False,
            ) from exc

    @staticmethod
    def _wrap_http_error(exc: HttpError, context: str) -> ProvisioningError:
        status_code = getattr(exc.resp, 'status', None)
        retryable = status_code in (429, 500, 502, 503, 504)
        return ProvisioningError(
            f"[Google {context}] HTTP {status_code}: {exc}",
            provider='GOOGLE',
            status_code=status_code,
            retryable=retryable,
        )

    def verify_connection(self, domain: str) -> dict:
        """Valida a delegação de domínio listando no máximo 1 conta do domínio."""
        if self.is_sandbox:
            logger.info("[Google Sandbox] Verificação simulada para %s", domain)
            return {'status': 'SANDBOX', 'provider': 'GOOGLE', 'domain': domain, 'users_checked': 0}

        service = self._get_service()
        try:
            res = service.users().list(domain=domain, maxResults=1).execute()
            return {
                'status': 'CONNECTED',
                'provider': 'GOOGLE',
                'domain': domain,
                'users_found': len(res.get('users', [])),
            }
        except HttpError as exc:
            raise self._wrap_http_error(exc, 'verify_connection') from exc

    def ensure_org_unit(self, org_unit_path: str) -> None:
        """Garante que a Unidade Organizacional (ex: /Alunos, /Docentes) existe."""
        if self.is_sandbox or not org_unit_path or org_unit_path == '/':
            return

        service = self._get_service()
        clean_path = org_unit_path.lstrip('/')
        try:
            service.orgunits().get(customerId=self.customer_id, orgUnitPath=clean_path).execute()
        except HttpError as exc:
            if getattr(exc.resp, 'status', None) != 404:
                raise self._wrap_http_error(exc, 'ensure_org_unit') from exc
            parts = clean_path.split('/')
            name = parts[-1]
            parent_path = '/' + '/'.join(parts[:-1]) if len(parts) > 1 else '/'
            try:
                service.orgunits().insert(
                    customerId=self.customer_id,
                    body={'name': name, 'parentOrgUnitPath': parent_path},
                ).execute()
            except HttpError as create_exc:
                # Ignora conflito caso outra tarefa paralela tenha criado a OU
                if getattr(create_exc.resp, 'status', None) != 409:
                    raise self._wrap_http_error(create_exc, 'create_org_unit') from create_exc

    def provision_user(
        self,
        full_name: str,
        institutional_email: str,
        org_unit: str = '/Alunos',
        external_id: str | None = None,
        password: str | None = None,
    ) -> dict:
        """Cria ou reativa/atualiza uma conta no Google Workspace da instituição."""
        if self.is_sandbox:
            logger.info("[Google Sandbox] Provisionando %s em %s", institutional_email, org_unit)
            return {
                'status': 'PROVISIONED',
                'sandbox': True,
                'provider': 'GOOGLE',
                'external_id': external_id or f"gsuite-sandbox-{institutional_email}",
                'institutional_email': institutional_email,
                'org_unit': org_unit,
            }

        service = self._get_service()
        self.ensure_org_unit(org_unit)
        given_name, family_name = split_full_name(full_name)
        user_key = external_id or institutional_email

        try:
            existing = service.users().get(userKey=user_key).execute()
            updated = service.users().update(
                userKey=existing['id'],
                body={
                    'name': {'givenName': given_name, 'familyName': family_name},
                    'orgUnitPath': org_unit,
                    'suspended': False,
                },
            ).execute()
            return {
                'status': 'REACTIVATED' if existing.get('suspended') else 'UPDATED',
                'sandbox': False,
                'provider': 'GOOGLE',
                'external_id': updated['id'],
                'institutional_email': updated['primaryEmail'],
                'org_unit': org_unit,
            }
        except HttpError as exc:
            if getattr(exc.resp, 'status', None) != 404:
                raise self._wrap_http_error(exc, 'get_user') from exc

        try:
            created = service.users().insert(
                body={
                    'primaryEmail': institutional_email,
                    'name': {'givenName': given_name, 'familyName': family_name},
                    'password': password or generate_temporary_password(),
                    'changePasswordAtNextLogin': True,
                    'orgUnitPath': org_unit,
                    'suspended': False,
                }
            ).execute()
            logger.info("[Google Provisioning] Conta criada para %s (ID=%s)", institutional_email, created['id'])
            return {
                'status': 'PROVISIONED',
                'sandbox': False,
                'provider': 'GOOGLE',
                'external_id': created['id'],
                'institutional_email': created['primaryEmail'],
                'org_unit': org_unit,
            }
        except HttpError as exc:
            raise self._wrap_http_error(exc, 'insert_user') from exc

    def suspend_user(self, institutional_email: str, external_id: str | None = None) -> dict:
        """Suspende imediatamente a conta no Google Workspace mantendo os ficheiros."""
        if self.is_sandbox:
            logger.info("[Google Sandbox] Suspendendo conta %s", institutional_email)
            return {
                'status': 'SUSPENDED',
                'sandbox': True,
                'provider': 'GOOGLE',
                'institutional_email': institutional_email,
            }

        service = self._get_service()
        user_key = external_id or institutional_email
        try:
            updated = service.users().update(
                userKey=user_key,
                body={'suspended': True},
            ).execute()
            logger.info("[Google Provisioning] Conta %s suspensa (ID=%s)", institutional_email, updated['id'])
            return {
                'status': 'SUSPENDED',
                'sandbox': False,
                'provider': 'GOOGLE',
                'external_id': updated['id'],
                'institutional_email': updated['primaryEmail'],
            }
        except HttpError as exc:
            if getattr(exc.resp, 'status', None) == 404:
                return {
                    'status': 'NOT_FOUND',
                    'sandbox': False,
                    'provider': 'GOOGLE',
                    'institutional_email': institutional_email,
                }
            raise self._wrap_http_error(exc, 'suspend_user') from exc
