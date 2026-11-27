import logging
import requests
from django.conf import settings

from apps.directory.models import AcademicUser
from apps.provisioning.services.base import split_full_name

logger = logging.getLogger(__name__)


class KeycloakSyncError(Exception):
    """Erro nas chamadas à Admin REST API do Keycloak."""


class KeycloakAdminService:
    """
    Cliente para sincronizar contas académicas (.edu.ao) com o Realm Keycloak
    e fornecer metadados OIDC / SAML 2.0 para Canva para Educação.
    """

    def __init__(
        self,
        base_url: str = '',
        public_url: str = '',
        realm: str = '',
        admin_user: str = '',
        admin_password: str = '',
        sandbox: bool = False,
    ):
        self.base_url = (base_url or getattr(settings, 'KEYCLOAK_INTERNAL_URL', 'http://keycloak:8080')).rstrip('/')
        self.public_url = (public_url or getattr(settings, 'KEYCLOAK_PUBLIC_URL', 'http://localhost:8080')).rstrip('/')
        self.realm = realm or getattr(settings, 'KEYCLOAK_REALM', 'edulink')
        self.admin_user = admin_user or getattr(settings, 'KEYCLOAK_ADMIN_USER', 'admin')
        self.admin_password = admin_password or getattr(settings, 'KEYCLOAK_ADMIN_PASSWORD', '')
        self.is_sandbox = sandbox or not bool(self.admin_password)
        self._token: str | None = None

    def _get_admin_token(self) -> str:
        if self._token:
            return self._token

        url = f"{self.base_url}/realms/master/protocol/openid-connect/token"
        try:
            resp = requests.post(
                url,
                data={
                    'client_id': 'admin-cli',
                    'username': self.admin_user,
                    'password': self.admin_password,
                    'grant_type': 'password',
                },
                timeout=10,
            )
        except requests.RequestException as exc:
            raise KeycloakSyncError(f"Keycloak inacessível em {self.base_url}: {exc}") from exc

        if resp.status_code >= 400:
            raise KeycloakSyncError(f"Falha ao autenticar no Keycloak ({resp.status_code}): {resp.text}")

        self._token = resp.json()['access_token']
        return self._token

    def _request(self, method: str, path: str, params: dict | None = None, json_body: dict | None = None):
        token = self._get_admin_token()
        url = f"{self.base_url}{path}"
        headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
        try:
            resp = requests.request(method, url, headers=headers, params=params, json=json_body, timeout=10)
        except requests.RequestException as exc:
            raise KeycloakSyncError(f"Erro de rede Keycloak ({method} {path}): {exc}") from exc

        if resp.status_code >= 400:
            raise KeycloakSyncError(f"Keycloak HTTP {resp.status_code} ({method} {path}): {resp.text}")

        if resp.status_code in (201, 204) or not resp.content:
            return {'location': resp.headers.get('Location', '')}
        return resp.json()

    def sync_academic_user(self, academic_user: AcademicUser) -> dict:
        """Cria ou atualiza o utilizador académico no Realm Keycloak para SSO."""
        if self.is_sandbox:
            return {
                'status': 'SANDBOX',
                'username': academic_user.institutional_email,
                'enabled': academic_user.is_active,
            }

        first_name, last_name = split_full_name(academic_user.full_name)
        existing = self._request(
            'GET',
            f"/admin/realms/{self.realm}/users",
            params={'username': academic_user.institutional_email, 'exact': 'true'},
        )
        user_payload = {
            'username': academic_user.institutional_email,
            'email': academic_user.institutional_email,
            'emailVerified': True,
            'enabled': academic_user.is_active,
            'firstName': first_name,
            'lastName': last_name,
            'attributes': {
                'school_id': [str(academic_user.school_id)],
                'school_domain': [academic_user.school.domain],
                'academic_role': [academic_user.role],
                'bi_or_student_id': [academic_user.bi_or_student_id],
            },
        }

        if isinstance(existing, list) and existing:
            kc_id = existing[0]['id']
            self._request('PUT', f"/admin/realms/{self.realm}/users/{kc_id}", json_body=user_payload)
            return {'status': 'UPDATED', 'keycloak_id': kc_id, 'username': academic_user.institutional_email}

        created = self._request('POST', f"/admin/realms/{self.realm}/users", json_body=user_payload)
        kc_id = (created.get('location') or '').rsplit('/', 1)[-1]
        return {'status': 'CREATED', 'keycloak_id': kc_id, 'username': academic_user.institutional_email}

    def disable_user(self, institutional_email: str) -> dict:
        """Desativa o utilizador no Keycloak e termina sessões SSO (ex: matrícula SUSPENDED)."""
        if self.is_sandbox:
            return {'status': 'SANDBOX_DISABLED', 'username': institutional_email}

        existing = self._request(
            'GET',
            f"/admin/realms/{self.realm}/users",
            params={'username': institutional_email, 'exact': 'true'},
        )
        if not isinstance(existing, list) or not existing:
            return {'status': 'NOT_FOUND', 'username': institutional_email}

        kc_id = existing[0]['id']
        self._request('PUT', f"/admin/realms/{self.realm}/users/{kc_id}", json_body={'enabled': False})
        self._request('POST', f"/admin/realms/{self.realm}/users/{kc_id}/logout")
        return {'status': 'DISABLED', 'keycloak_id': kc_id, 'username': institutional_email}

    def get_sso_metadata(self, school) -> dict:
        """Devolve URLs OIDC/SAML 2.0 do Keycloak e guia de ligação ao Canva para Educação."""
        realm_base = f"{self.public_url}/realms/{self.realm}"
        return {
            'realm': self.realm,
            'school_domain': school.domain or school.effective_site_host,
            'oidc_discovery_url': f"{realm_base}/.well-known/openid-configuration",
            'oidc_portal_client_id': 'edulink-portal',
            'saml_idp_metadata_url': f"{realm_base}/protocol/saml/descriptor",
            'saml_sso_endpoint': f"{realm_base}/protocol/saml",
            'saml_entity_id': realm_base,
            'canva_education_saml': {
                'sp_entity_id': 'https://www.canva.com',
                'acs_url_pattern': 'https://www.canva.com/login/saml/<team-id>',
                'name_id_format': 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
                'mapped_attributes': ['email', 'firstName', 'lastName', 'school_domain', 'academic_role'],
            },
        }
