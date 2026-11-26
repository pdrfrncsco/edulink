import ipaddress
from django.db import transaction
from apps.domains.models import DNSRecord, DomainConfiguration
from apps.tenants.models import CloudIntegration


def _is_ipv4(value: str) -> bool:
    try:
        ipaddress.IPv4Address(value.strip())
        return True
    except ValueError:
        return False


def _normalize_google_verification(token: str) -> str:
    token = token.strip()
    if token.startswith('google-site-verification='):
        return token
    return f"google-site-verification={token}"


def _normalize_microsoft_verification(token: str) -> str:
    token = token.strip()
    if token.upper().startswith('MS='):
        return f"MS={token[3:]}"
    return f"MS={token}"


def _normalize_dkim_value(public_key: str) -> str:
    key = public_key.strip()
    if key.startswith('v=DKIM1'):
        return key
    return f"v=DKIM1; k=rsa; p={key}"


def _microsoft_mx_host(domain: str) -> str:
    return f"{domain.lower().replace('.', '-')}.mail.protection.outlook.com"


def generate_dns_blueprint(
    domain_config: DomainConfiguration,
    providers: list[str] | None = None,
    replace_existing: bool = True,
) -> list[DNSRecord]:
    """
    Gera o conjunto padronizado de registos DNS (A/CNAME, TXT de verificação,
    MX, SPF combinado, DKIM e DMARC) para o domínio .edu.ao da escola.
    """
    school = domain_config.school
    if providers is None:
        providers = list(
            CloudIntegration.objects.filter(school=school, sync_enabled=True).values_list('provider', flat=True)
        )
    if not providers:
        # Padrão EduLink MVP: Google Workspace for Education
        providers = ['GOOGLE']

    use_google = 'GOOGLE' in providers
    use_microsoft = 'MICROSOFT' in providers

    desired: list[dict] = []

    # 1. Registos Web (@ e www) para o site institucional Next.js (.edu.ao)
    target = (domain_config.target_web_ip_or_cname or 'sites.edulink.ao').strip()
    root_type = DNSRecord.RecordType.A if _is_ipv4(target) else DNSRecord.RecordType.CNAME
    desired.append({
        'record_type': root_type,
        'name': '@',
        'content': target,
        'ttl': 1,
        'priority': None,
        'proxied': True,
        'purpose': DNSRecord.Purpose.WEB,
    })
    desired.append({
        'record_type': DNSRecord.RecordType.CNAME,
        'name': 'www',
        'content': school.domain,
        'ttl': 1,
        'priority': None,
        'proxied': True,
        'purpose': DNSRecord.Purpose.WEB,
    })

    # 2. Verificação de propriedade de domínio (TXT)
    if domain_config.google_verification_token:
        desired.append({
            'record_type': DNSRecord.RecordType.TXT,
            'name': '@',
            'content': _normalize_google_verification(domain_config.google_verification_token),
            'ttl': 3600,
            'priority': None,
            'proxied': False,
            'purpose': DNSRecord.Purpose.GOOGLE_VERIFY,
        })

    if domain_config.microsoft_verification_token:
        desired.append({
            'record_type': DNSRecord.RecordType.TXT,
            'name': '@',
            'content': _normalize_microsoft_verification(domain_config.microsoft_verification_token),
            'ttl': 3600,
            'priority': None,
            'proxied': False,
            'purpose': DNSRecord.Purpose.MICROSOFT_VERIFY,
        })

    # 3. Registos MX (Google Workspace / Microsoft Exchange Online)
    if use_google:
        desired.append({
            'record_type': DNSRecord.RecordType.MX,
            'name': '@',
            'content': 'smtp.google.com',
            'ttl': 3600,
            'priority': 1,
            'proxied': False,
            'purpose': DNSRecord.Purpose.MX_GOOGLE,
        })

    if use_microsoft:
        desired.append({
            'record_type': DNSRecord.RecordType.MX,
            'name': '@',
            'content': _microsoft_mx_host(school.domain),
            'ttl': 3600,
            'priority': 10 if use_google else 0,
            'proxied': False,
            'purpose': DNSRecord.Purpose.MX_MICROSOFT,
        })

    # 4. Registo único SPF (RFC 7208 proíbe múltiplos registos v=spf1 no mesmo domínio)
    spf_includes = []
    if use_google:
        spf_includes.append('include:_spf.google.com')
    if use_microsoft:
        spf_includes.append('include:spf.protection.outlook.com')
    if spf_includes:
        desired.append({
            'record_type': DNSRecord.RecordType.TXT,
            'name': '@',
            'content': f"v=spf1 {' '.join(spf_includes)} ~all",
            'ttl': 3600,
            'priority': None,
            'proxied': False,
            'purpose': DNSRecord.Purpose.SPF,
        })

    # 5. Assinatura DKIM
    if domain_config.dkim_public_key:
        selector = (domain_config.dkim_selector or 'google').strip()
        desired.append({
            'record_type': DNSRecord.RecordType.TXT,
            'name': f"{selector}._domainkey",
            'content': _normalize_dkim_value(domain_config.dkim_public_key),
            'ttl': 3600,
            'priority': None,
            'proxied': False,
            'purpose': DNSRecord.Purpose.DKIM,
        })

    # 6. Política DMARC
    desired.append({
        'record_type': DNSRecord.RecordType.TXT,
        'name': '_dmarc',
        'content': f"v=DMARC1; p=quarantine; rua=mailto:dmarc@{school.domain}; pct=100; adkim=r; aspf=r",
        'ttl': 3600,
        'priority': None,
        'proxied': False,
        'purpose': DNSRecord.Purpose.DMARC,
    })

    managed_purposes = [
        DNSRecord.Purpose.WEB,
        DNSRecord.Purpose.GOOGLE_VERIFY,
        DNSRecord.Purpose.MICROSOFT_VERIFY,
        DNSRecord.Purpose.MX_GOOGLE,
        DNSRecord.Purpose.MX_MICROSOFT,
        DNSRecord.Purpose.SPF,
        DNSRecord.Purpose.DKIM,
        DNSRecord.Purpose.DMARC,
    ]

    with transaction.atomic():
        if replace_existing:
            domain_config.records.filter(purpose__in=managed_purposes).delete()

        saved_records = []
        for spec in desired:
            record, _ = DNSRecord.objects.update_or_create(
                domain_config=domain_config,
                record_type=spec['record_type'],
                name=spec['name'],
                purpose=spec['purpose'],
                defaults={
                    'content': spec['content'],
                    'ttl': spec['ttl'],
                    'priority': spec['priority'],
                    'proxied': spec['proxied'],
                    'sync_state': DNSRecord.SyncState.PENDING,
                },
            )
            saved_records.append(record)

    return saved_records
