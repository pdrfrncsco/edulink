import logging
import requests
from django.conf import settings
from django.utils import timezone

from apps.domains.models import DNSRecord, DomainConfiguration

logger = logging.getLogger(__name__)

CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4'

# Prefixos usados para distinguir múltiplos registos TXT no mesmo host (@)
TXT_PURPOSE_PREFIXES = {
    DNSRecord.Purpose.GOOGLE_VERIFY: 'google-site-verification=',
    DNSRecord.Purpose.MICROSOFT_VERIFY: 'MS=',
    DNSRecord.Purpose.SPF: 'v=spf1',
    DNSRecord.Purpose.DKIM: 'v=DKIM1',
    DNSRecord.Purpose.DMARC: 'v=DMARC1',
}


class CloudflareError(Exception):
    """Erro padronizado nas chamadas à API REST v4 da Cloudflare."""

    def __init__(self, message: str, status_code: int | None = None, retryable: bool = False):
        super().__init__(message)
        self.status_code = status_code
        self.retryable = retryable


class CloudflareDNSService:
    """
    Cliente da Cloudflare API v4 para criação automática de zonas .edu.ao
    e sincronização idempotente de registos A, CNAME, MX e TXT (SPF/DKIM/DMARC).
    """

    def __init__(self, api_token: str = '', account_id: str = '', sandbox: bool | None = None):
        self.api_token = (api_token or getattr(settings, 'CLOUDFLARE_API_TOKEN', '')).strip()
        self.account_id = (account_id or getattr(settings, 'CLOUDFLARE_ACCOUNT_ID', '')).strip()
        if sandbox is not None:
            self.is_sandbox = sandbox
        else:
            self.is_sandbox = not bool(self.api_token) or self.api_token.lower() == 'sandbox'

    @classmethod
    def for_domain_config(cls, domain_config: DomainConfiguration) -> 'CloudflareDNSService':
        return cls(
            api_token=domain_config.get_api_token(),
            account_id=domain_config.cloudflare_account_id,
        )

    def _request(self, method: str, path: str, params: dict | None = None, json_body: dict | None = None) -> dict:
        headers = {
            'Authorization': f'Bearer {self.api_token}',
            'Content-Type': 'application/json',
        }
        url = f"{CLOUDFLARE_API_BASE}{path}"
        try:
            resp = requests.request(method, url, headers=headers, params=params, json=json_body, timeout=15)
        except requests.RequestException as exc:
            raise CloudflareError(f"[Cloudflare {method} {path}] Erro de rede: {exc}", retryable=True) from exc

        if resp.status_code >= 400:
            retryable = resp.status_code in (429, 500, 502, 503, 504)
            raise CloudflareError(
                f"[Cloudflare {method} {path}] HTTP {resp.status_code}: {resp.text}",
                status_code=resp.status_code,
                retryable=retryable,
            )

        payload = resp.json()
        if not payload.get('success', False):
            errors = payload.get('errors', [])
            raise CloudflareError(f"[Cloudflare API] Falha: {errors}", status_code=resp.status_code, retryable=False)
        return payload

    @staticmethod
    def _fqdn(name: str, domain: str) -> str:
        clean = (name or '@').strip().rstrip('.')
        if clean in ('@', '', domain):
            return domain
        if clean.endswith(f".{domain}"):
            return clean
        return f"{clean}.{domain}"

    def ensure_zone(self, domain: str) -> dict:
        """Obtém a zona Cloudflare existente ou cria uma nova zona Full DNS."""
        if self.is_sandbox:
            logger.info("[Cloudflare Sandbox] Zona garantida para %s", domain)
            return {
                'zone_id': f"cf-zone-sandbox-{domain}",
                'status': 'pending',
                'name_servers': ['arya.ns.cloudflare.com', 'zeus.ns.cloudflare.com'],
                'sandbox': True,
            }

        existing = self._request('GET', '/zones', params={'name': domain})
        zones = existing.get('result', [])
        if zones:
            zone = zones[0]
            return {
                'zone_id': zone['id'],
                'status': zone.get('status', 'pending'),
                'name_servers': zone.get('name_servers', []),
                'sandbox': False,
            }

        if not self.account_id:
            raise CloudflareError(
                'CLOUDFLARE_ACCOUNT_ID é obrigatório para criar uma nova zona na Cloudflare.',
                retryable=False,
            )

        created = self._request(
            'POST',
            '/zones',
            json_body={
                'name': domain,
                'account': {'id': self.account_id},
                'type': 'full',
                'jump_start': False,
            },
        )['result']
        return {
            'zone_id': created['id'],
            'status': created.get('status', 'pending'),
            'name_servers': created.get('name_servers', []),
            'sandbox': False,
        }

    def list_dns_records(self, zone_id: str) -> list[dict]:
        if self.is_sandbox:
            return []
        return self._request('GET', f"/zones/{zone_id}/dns_records", params={'per_page': 100}).get('result', [])

    @staticmethod
    def _match_existing_record(existing_records: list[dict], record: DNSRecord, fqdn: str) -> dict | None:
        """Encontra um registo correspondente evitando colisões entre múltiplos TXT em @."""
        prefix = TXT_PURPOSE_PREFIXES.get(record.purpose)
        for item in existing_records:
            if item.get('type') != record.record_type or item.get('name') != fqdn:
                continue
            if record.record_type == DNSRecord.RecordType.TXT and prefix:
                if (item.get('content') or '').startswith(prefix):
                    return item
                continue
            if record.record_type == DNSRecord.RecordType.MX:
                if (item.get('content') or '').rstrip('.') == record.content.rstrip('.'):
                    return item
                continue
            return item
        return None

    def upsert_dns_record(self, zone_id: str, domain: str, record: DNSRecord, existing_records: list[dict] | None = None) -> dict:
        fqdn = self._fqdn(record.name, domain)
        if self.is_sandbox:
            cf_id = record.cloudflare_record_id or f"cf-rec-{record.record_type.lower()}-{record.purpose.lower()}"
            record.cloudflare_record_id = cf_id
            record.sync_state = DNSRecord.SyncState.SYNCED
            record.save(update_fields=['cloudflare_record_id', 'sync_state'])
            return {'id': cf_id, 'name': fqdn, 'type': record.record_type, 'sandbox': True}

        if existing_records is None:
            existing_records = self.list_dns_records(zone_id)

        body = {
            'type': record.record_type,
            'name': fqdn,
            'content': record.content,
            'ttl': record.ttl,
            'proxied': record.proxied if record.record_type in ('A', 'AAAA', 'CNAME') else False,
        }
        if record.record_type == DNSRecord.RecordType.MX and record.priority is not None:
            body['priority'] = record.priority

        matched = self._match_existing_record(existing_records, record, fqdn)
        if matched:
            result = self._request('PUT', f"/zones/{zone_id}/dns_records/{matched['id']}", json_body=body)['result']
        else:
            result = self._request('POST', f"/zones/{zone_id}/dns_records", json_body=body)['result']

        record.cloudflare_record_id = result['id']
        record.sync_state = DNSRecord.SyncState.SYNCED
        record.save(update_fields=['cloudflare_record_id', 'sync_state'])
        return result

    def sync_domain_configuration(self, domain_config: DomainConfiguration) -> dict:
        """Sincroniza a zona e todos os registos DNS da escola na Cloudflare."""
        domain = domain_config.school.domain
        zone_info = self.ensure_zone(domain)
        zone_id = zone_info['zone_id']

        domain_config.cloudflare_zone_id = zone_id
        domain_config.nameservers = zone_info.get('name_servers', [])

        existing_records = self.list_dns_records(zone_id)
        synced_count = 0
        for record in domain_config.records.all():
            self.upsert_dns_record(zone_id, domain, record, existing_records=existing_records)
            synced_count += 1

        if zone_info.get('status') == 'active':
            domain_config.registrar_status = DomainConfiguration.RegistrarStatus.ACTIVE
        elif domain_config.nameservers:
            domain_config.registrar_status = DomainConfiguration.RegistrarStatus.NAMESERVERS_DELEGATED

        domain_config.last_synced_at = timezone.now()
        domain_config.last_error = ''
        domain_config.save(
            update_fields=[
                'cloudflare_zone_id',
                'nameservers',
                'registrar_status',
                'last_synced_at',
                'last_error',
            ]
        )
        return {
            'zone_id': zone_id,
            'nameservers': domain_config.nameservers,
            'synced_records': synced_count,
            'registrar_status': domain_config.registrar_status,
            'sandbox': zone_info.get('sandbox', False),
        }
