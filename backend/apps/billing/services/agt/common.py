from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.utils import timezone

IVA_RATE_AO = Decimal('14.00')
IVA_DIVISOR = Decimal('1.14')
DEFAULT_SERIES = f"FT EL{timezone.localdate().year}"
SAFT_XML_NAMESPACE = 'urn:OECD:StandardAuditFile-Tax:AO_1.01_01'


def get_issuer_config() -> dict:
    """Lê a identidade fiscal da EduLink a partir de settings (com fallback de desenvolvimento)."""
    return {
        'name': getattr(settings, 'EDULINK_ISSUER_NAME', 'EduLink Tecnologia Educacional, Lda.'),
        'nif': getattr(settings, 'EDULINK_ISSUER_NIF', '5417098123'),
        'software_cert': getattr(settings, 'EDULINK_AGT_SOFTWARE_CERT', 'AGT-CERT-EDULINK-2026'),
        'city': getattr(settings, 'EDULINK_ISSUER_CITY', 'Luanda'),
        'address': getattr(settings, 'EDULINK_ISSUER_ADDRESS', 'Talatona, Luanda'),
    }


def get_active_series(issue_date: datetime | None = None) -> str:
    """Retorna a série fiscal ativa (ex.: FT EL2026 em 2026, FT EL2027 a partir de Jan/2027)."""
    configured = getattr(settings, 'EDULINK_AGT_SERIES', '').strip()
    if configured:
        return configured
    ref_year = timezone.localtime(issue_date).year if issue_date else timezone.localdate().year
    return f'FT EL{ref_year}'


def format_aoa(amount: Decimal) -> str:
    """Formata montantes no padrão angolano: 150.000,00 Kz."""
    formatted = f'{amount:,.2f}'
    return formatted.replace(',', 'X').replace('.', ',').replace('X', '.') + ' Kz'


def calculate_iva_breakdown(total_aoa: Decimal) -> tuple[Decimal, Decimal, Decimal]:
    """Calcula base tributável, IVA (14%) e total a partir do valor final em AOA."""
    total = Decimal(total_aoa).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    if total < Decimal('0.00'):
        raise ValueError('O montante da fatura não pode ser negativo.')
    subtotal = (total / IVA_DIVISOR).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    iva_amount = (total - subtotal).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return subtotal, iva_amount, total
