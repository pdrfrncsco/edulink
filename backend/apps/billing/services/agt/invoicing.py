from datetime import datetime
from decimal import Decimal
import hashlib

from django.db import transaction
from django.utils import timezone

from apps.billing.models import AGTInvoice, KwanzaPayment
from .common import (
    IVA_RATE_AO,
    calculate_iva_breakdown,
    get_active_series,
    get_issuer_config,
)


def _build_agt_hash(
    issue_date: datetime,
    invoice_number: str,
    total_aoa: Decimal,
    previous_hash: str,
) -> tuple[str, str]:
    canonical = (
        f"{issue_date.strftime('%Y-%m-%dT%H:%M:%SZ')};"
        f"{invoice_number};"
        f"{total_aoa:.2f};"
        f"{previous_hash}"
    )
    digest = hashlib.sha256(canonical.encode('utf-8')).hexdigest()
    return digest, digest[:4].upper()


@transaction.atomic
def issue_agt_invoice(payment: KwanzaPayment) -> AGTInvoice:
    """
    Emite uma Fatura Eletrónica compatível com AGT (Angola) com numeração sequencial
    isolada por série anual, IVA 14%, hash encadeado SHA-256 e estrutura SAF-T (AO).
    Idempotente por pagamento.
    """
    existing = AGTInvoice.objects.filter(payment=payment).first()
    if existing:
        return existing

    issue_date = timezone.now()
    series = get_active_series(issue_date)
    issuer = get_issuer_config()

    last_invoice = (
        AGTInvoice.objects.select_for_update()
        .filter(series=series)
        .order_by('-sequence_number')
        .first()
    )
    next_seq = (last_invoice.sequence_number + 1) if last_invoice else 1
    previous_hash = last_invoice.agt_hash if last_invoice else ''

    invoice_number = f'{series}/{next_seq:05d}'
    subtotal_aoa, iva_amount_aoa, total_aoa = calculate_iva_breakdown(payment.amount_aoa)
    agt_hash, hash_control = _build_agt_hash(issue_date, invoice_number, total_aoa, previous_hash)

    customer_name = (
        payment.customer_name
        or (payment.school.name if payment.school else '')
        or (payment.academic_user.full_name if payment.academic_user else '')
        or 'Consumidor Final'
    )
    customer_nif = (
        payment.customer_nif
        or (payment.school.nif if payment.school else '')
        or '999999999'
    )
    description = payment.description or 'Serviços de Plataforma Educacional EduLink'

    qr_payload = (
        f"A:{issuer['nif']}*B:{customer_nif}*C:AO*D:FT*E:N*"
        f"F:{issue_date.strftime('%Y%m%d')}*G:{invoice_number}*"
        f"H:{hash_control}*I1:AO*I7:{subtotal_aoa:.2f}*I8:{iva_amount_aoa:.2f}*"
        f"N:{iva_amount_aoa:.2f}*O:{total_aoa:.2f}*Q:{hash_control}*R:{issuer['software_cert']}"
    )

    saft_payload = {
        'InvoiceNo': invoice_number,
        'InvoiceStatus': 'N',
        'InvoiceDate': issue_date.strftime('%Y-%m-%d'),
        'SystemEntryDate': issue_date.strftime('%Y-%m-%dT%H:%M:%S'),
        'Hash': agt_hash,
        'HashControl': hash_control,
        'CustomerTaxID': customer_nif,
        'CustomerName': customer_name,
        'PaymentMethod': payment.payment_method,
        'PaymentReference': payment.reference,
        'Line': [
            {
                'LineNumber': 1,
                'Description': description,
                'Quantity': 1,
                'UnitOfMeasure': 'UN',
                'UnitPrice': f'{subtotal_aoa:.2f}',
                'TaxPercentage': f'{IVA_RATE_AO:.2f}',
                'TaxAmount': f'{iva_amount_aoa:.2f}',
            }
        ],
        'DocumentTotals': {
            'TaxPayable': f'{iva_amount_aoa:.2f}',
            'NetTotal': f'{subtotal_aoa:.2f}',
            'GrossTotal': f'{total_aoa:.2f}',
            'CurrencyCode': 'AOA',
        },
    }

    return AGTInvoice.objects.create(
        school=payment.school,
        payment=payment,
        issuer_name=issuer['name'],
        issuer_nif=issuer['nif'],
        series=series,
        sequence_number=next_seq,
        invoice_number=invoice_number,
        issue_date=issue_date,
        customer_name=customer_name,
        customer_nif=customer_nif,
        subtotal_aoa=subtotal_aoa,
        iva_rate=IVA_RATE_AO,
        iva_amount_aoa=iva_amount_aoa,
        total_aoa=total_aoa,
        previous_hash=previous_hash,
        agt_hash=agt_hash,
        hash_control=hash_control,
        software_certificate_no=issuer['software_cert'],
        qr_payload=qr_payload,
        saft_payload=saft_payload,
    )
