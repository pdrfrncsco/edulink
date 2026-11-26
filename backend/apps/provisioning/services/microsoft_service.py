import logging
import time
from urllib.parse import quote
import requests

from .base import ProvisioningError, generate_temporary_password, split_full_name

logger = logging.getLogger(__name__)

GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0'
STUDENT_SKU_PART_NUMBERS = ('STANDARDWOFFPACK_STUDENT', 'M365EDU_A1_STUDENT')
FACULTY_SKU_PART_NUMBERS = ('STANDARDWOFFPACK_FACULTY', 'M365EDU_A1_FACULTY')


class Microsoft365Provisioner:
    """
    Conector real de integração com o Microsoft 365 Education (A1) e Entra ID
    utilizando Microsoft Graph API v1.0 via App Registration (Client Credentials).
    """

    def __init__(
        self,
        tenant_id: str,
        client_id: str,
        client_secret: str,
        student_sku_id: str = '',
        faculty_sku_id: str = '',
        usage_location: str = 'AO',
        sandbox: bool = False,
    ):
        self.tenant_id = (tenant_id or '').strip()
        self.client_id = (client_id or '').strip()
        self.client_secret = (client_secret or '').strip()
        self.student_sku_id = (student_sku_id or '').strip()
        self.faculty_sku_id = (faculty_sku_id or '').strip()
        self.usage_location = usage_location or 'AO'
        self.is_sandbox = bool(
            sandbox or not (self.tenant_id and self.client_id and self.client_secret)
        )
        self._access_token: str | None = None
        self._token_expires_at: float = 0.0

    @classmethod
    def from_credentials(cls, creds: dict | None) -> 'Microsoft365Provisioner':
        creds = creds if isinstance(creds, dict) else {}
        return cls(
            tenant_id=creds.get('tenant_id', ''),
            client_id=creds.get('client_id', ''),
            client_secret=creds.get('client_secret', ''),
            student_sku_id=creds.get('student_sku_id', ''),
            faculty_sku_id=creds.get('faculty_sku_id', ''),
            usage_location=creds.get('usage_location', 'AO'),
            sandbox=bool(creds.get('sandbox', False)),
        )

    def _get_access_token(self) -> str:
        if self._access_token and time.time() < (self._token_expires_at - 60):
            return self._access_token

        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        try:
            response = requests.post(
                token_url,
                data={
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'scope': 'https://graph.microsoft.com/.default',
                    'grant_type': 'client_credentials',
                },
                timeout=15,
            )
        except requests.RequestException as exc:
            raise ProvisioningError(
                f"[Microsoft OAuth] Erro de rede ao obter token: {exc}",
                provider='MICROSOFT',
                retryable=True,
            ) from exc

        if response.status_code >= 400:
            retryable = response.status_code in (429, 500, 502, 503, 504)
            raise ProvisioningError(
                f"[Microsoft OAuth] HTTP {response.status_code}: {response.text}",
                provider='MICROSOFT',
                status_code=response.status_code,
                retryable=retryable,
            )

        token_data = response.json()
        self._access_token = token_data['access_token']
        self._token_expires_at = time.time() + int(token_data.get('expires_in', 3600))
        return self._access_token

    def _request(self, method: str, path: str, json_body: dict | None = None, allow_not_found: bool = False):
        token = self._get_access_token()
        url = f"{GRAPH_BASE_URL}{path}"
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        }
        try:
            response = requests.request(method, url, headers=headers, json=json_body, timeout=15)
        except requests.RequestException as exc:
            raise ProvisioningError(
                f"[Microsoft Graph {method} {path}] Erro de rede: {exc}",
                provider='MICROSOFT',
                retryable=True,
            ) from exc

        if allow_not_found and response.status_code == 404:
            return None

        if response.status_code >= 400:
            retryable = response.status_code in (429, 500, 502, 503, 504)
            raise ProvisioningError(
                f"[Microsoft Graph {method} {path}] HTTP {response.status_code}: {response.text}",
                provider='MICROSOFT',
                status_code=response.status_code,
                retryable=retryable,
            )

        if response.status_code == 204 or not response.content:
            return {}
        return response.json()

    def _discover_sku_ids(self) -> dict:
        """Descobre automaticamente os skuId A1 disponíveis no tenant caso não configurados."""
        skus_resp = self._request('GET', '/subscribedSkus')
        discovered = {'student_sku_id': self.student_sku_id, 'faculty_sku_id': self.faculty_sku_id}
        for sku in skus_resp.get('value', []):
            part = sku.get('skuPartNumber', '')
            if not discovered['student_sku_id'] and part in STUDENT_SKU_PART_NUMBERS:
                discovered['student_sku_id'] = sku.get('skuId', '')
            if not discovered['faculty_sku_id'] and part in FACULTY_SKU_PART_NUMBERS:
                discovered['faculty_sku_id'] = sku.get('skuId', '')
        return discovered

    def verify_connection(self) -> dict:
        """Valida as credenciais Entra ID e lista os SKUs educacionais disponíveis."""
        if self.is_sandbox:
            logger.info("[Microsoft Sandbox] Verificação simulada de ligação Entra ID")
            return {'status': 'SANDBOX', 'provider': 'MICROSOFT', 'tenant_id': self.tenant_id or 'sandbox'}

        org = self._request('GET', '/organization')
        skus = self._discover_sku_ids()
        org_names = [item.get('displayName') for item in org.get('value', [])]
        return {
            'status': 'CONNECTED',
            'provider': 'MICROSOFT',
            'organization': org_names[0] if org_names else self.tenant_id,
            'skus': skus,
        }

    def _assign_license(self, user_id: str, is_faculty: bool) -> str | None:
        sku_id = self.faculty_sku_id if is_faculty else self.student_sku_id
        if not sku_id:
            discovered = self._discover_sku_ids()
            sku_id = discovered['faculty_sku_id'] if is_faculty else discovered['student_sku_id']
        if not sku_id:
            return None

        self._request(
            'POST',
            f"/users/{quote(user_id, safe='')}/assignLicense",
            json_body={
                'addLicenses': [{'skuId': sku_id, 'disabledPlans': []}],
                'removeLicenses': [],
            },
        )
        return sku_id

    def provision_user(
        self,
        full_name: str,
        institutional_email: str,
        is_faculty: bool = False,
        external_id: str | None = None,
        password: str | None = None,
    ) -> dict:
        """Cria ou reativa a conta no Microsoft Entra ID e atribui licença M365 A1."""
        sku_label = 'M365_A1_FACULTY' if is_faculty else 'M365_A1_STUDENT'
        if self.is_sandbox:
            logger.info("[Microsoft Sandbox] Provisionando %s (%s)", institutional_email, sku_label)
            return {
                'status': 'PROVISIONED',
                'sandbox': True,
                'provider': 'MICROSOFT',
                'external_id': external_id or f"ms-sandbox-{institutional_email}",
                'institutional_email': institutional_email,
                'sku': sku_label,
            }

        given_name, surname = split_full_name(full_name)
        user_key = quote(external_id or institutional_email, safe='')
        existing = self._request('GET', f"/users/{user_key}", allow_not_found=True)

        if existing:
            user_id = existing['id']
            self._request(
                'PATCH',
                f"/users/{quote(user_id, safe='')}",
                json_body={
                    'accountEnabled': True,
                    'displayName': full_name,
                    'givenName': given_name,
                    'surname': surname,
                    'usageLocation': self.usage_location,
                },
            )
            assigned_sku = self._assign_license(user_id, is_faculty=is_faculty)
            return {
                'status': 'REACTIVATED' if not existing.get('accountEnabled', True) else 'UPDATED',
                'sandbox': False,
                'provider': 'MICROSOFT',
                'external_id': user_id,
                'institutional_email': existing.get('userPrincipalName', institutional_email),
                'sku': assigned_sku or sku_label,
            }

        mail_nickname = institutional_email.split('@')[0][:64]
        created = self._request(
            'POST',
            '/users',
            json_body={
                'accountEnabled': True,
                'displayName': full_name,
                'givenName': given_name,
                'surname': surname,
                'mailNickname': mail_nickname,
                'userPrincipalName': institutional_email,
                'usageLocation': self.usage_location,
                'passwordProfile': {
                    'forceChangePasswordNextSignIn': True,
                    'password': password or generate_temporary_password(),
                },
            },
        )
        user_id = created['id']
        assigned_sku = self._assign_license(user_id, is_faculty=is_faculty)
        logger.info("[Microsoft Provisioning] Conta criada para %s (ObjectID=%s)", institutional_email, user_id)
        return {
            'status': 'PROVISIONED',
            'sandbox': False,
            'provider': 'MICROSOFT',
            'external_id': user_id,
            'institutional_email': created.get('userPrincipalName', institutional_email),
            'sku': assigned_sku or sku_label,
        }

    def suspend_user(self, institutional_email: str, external_id: str | None = None) -> dict:
        """Desativa o login (accountEnabled=False) e revoga sessões ativas no Entra ID."""
        if self.is_sandbox:
            logger.info("[Microsoft Sandbox] Desativando utilizador %s", institutional_email)
            return {
                'status': 'SUSPENDED',
                'sandbox': True,
                'provider': 'MICROSOFT',
                'institutional_email': institutional_email,
            }

        user_key = quote(external_id or institutional_email, safe='')
        existing = self._request('GET', f"/users/{user_key}", allow_not_found=True)
        if not existing:
            return {
                'status': 'NOT_FOUND',
                'sandbox': False,
                'provider': 'MICROSOFT',
                'institutional_email': institutional_email,
            }

        user_id = existing['id']
        self._request('PATCH', f"/users/{quote(user_id, safe='')}", json_body={'accountEnabled': False})
        self._request('POST', f"/users/{quote(user_id, safe='')}/revokeSignInSessions")
        logger.info("[Microsoft Provisioning] Conta %s desativada e sessões revogadas", institutional_email)
        return {
            'status': 'SUSPENDED',
            'sandbox': False,
            'provider': 'MICROSOFT',
            'external_id': user_id,
            'institutional_email': existing.get('userPrincipalName', institutional_email),
        }
