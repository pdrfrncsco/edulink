import logging
import requests
from django.utils import timezone

from apps.domains.models import DNSRecord, DomainConfiguration

logger = logging.getLogger(__name__)

DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query'


def query_doh(fqdn: str, record_type: str) -> list[str]:
    """Consulta registos públicos via Cloudflare DNS-over-HTTPS (JSON)."""
    try:
        resp = requests.get(
            DOH_ENDPOINT,
            params={'name': fqdn, 'type': record_type},
            headers={'Accept': 'application/dns-json'},
            timeout=10,
        )
        if resp.status_code != 200:
            return []
        data = resp.json()
        return [ans.get('data', '').strip('"') for ans in data.get('Answer', [])]
    except requests.RequestException as exc:
        logger.warning("Falha na consulta DoH para %s (%s): %s", fqdn, record_type, exc)
        return []


def check_domain_propagation(domain_config: DomainConfiguration) -> dict:
    """
    Verifica a propagação pública de NS e de todos os registos DNS configurados.
    Atualiza o estado de propagação e promove a zona para ACTIVE quando completa.
    """
    domain = domain_config.school.domain
    ns_answers = [ans.rstrip('.').lower() for ans in query_doh(domain, 'NS')]
    expected_ns = [ns.rstrip('.').lower() for ns in (domain_config.nameservers or [])]
    ns_delegated = bool(expected_ns) and all(ns in ns_answers for ns in expected_ns)

    checked_records = []
    now = timezone.now()
    for record in domain_config.records.all():
        fqdn = domain if record.name in ('@', '', domain) else f"{record.name}.{domain}"
        answers = query_doh(fqdn, record.record_type)

        expected_val = record.content.strip().rstrip('.').lower()
        normalized_answers = [a.strip().rstrip('.').lower() for a in answers]
        # Registos MX DoH incluem prioridade no início (ex: "1 smtp.google.com")
        is_propagated = any(
            expected_val == ans or ans.endswith(f" {expected_val}")
            for ans in normalized_answers
        )
        # Registos proxied (A/CNAME com nuvem laranja) resolvem para IPs da Cloudflare
        if record.proxied and record.record_type in ('A', 'CNAME') and answers:
            is_propagated = True

        record.propagated = is_propagated
        record.last_checked_at = now
        record.save(update_fields=['propagated', 'last_checked_at'])
        checked_records.append({
            'id': str(record.id),
            'type': record.record_type,
            'name': fqdn,
            'purpose': record.purpose,
            'propagated': is_propagated,
            'observed': answers,
        })

    all_propagated = bool(checked_records) and all(r['propagated'] for r in checked_records)
    if ns_delegated and all_propagated:
        domain_config.registrar_status = DomainConfiguration.RegistrarStatus.ACTIVE
        domain_config.save(update_fields=['registrar_status'])

    return {
        'domain': domain,
        'nameservers_expected': expected_ns,
        'nameservers_observed': ns_answers,
        'ns_delegated': ns_delegated,
        'all_records_propagated': all_propagated,
        'registrar_status': domain_config.registrar_status,
        'records': checked_records,
    }


def build_dns_ao_dossier(domain_config: DomainConfiguration) -> dict:
    """
    Gera o pacote de instruções e requisitos oficiais para registo e delegação
    de domínio .edu.ao junto de um Registrar acreditado pela DNS.AO.
    """
    school = domain_config.school
    return {
        'domain': school.domain,
        'institution': school.name,
        'nif': school.nif,
        'alvara_med_mescti': school.alvara_med_mescti,
        'registrar_status': domain_config.registrar_status,
        'nameservers_to_configure': domain_config.nameservers or [
            'arya.ns.cloudflare.com',
            'zeus.ns.cloudflare.com',
        ],
        'required_documents': [
            f'Cópia do NIF Institucional ({school.nif})',
            f'Alvará MED/MESCTI ({school.alvara_med_mescti})',
            'Cópia do BI do Diretor / Representante Legal',
            f'Declaração / Pedido formal de delegação DNS para {school.domain}',
        ],
        'dns_records_summary': [
            {
                'type': r.record_type,
                'name': r.name,
                'content': r.content,
                'priority': r.priority,
                'purpose': r.purpose,
                'sync_state': r.sync_state,
            }
            for r in domain_config.records.all()
        ],
    }
