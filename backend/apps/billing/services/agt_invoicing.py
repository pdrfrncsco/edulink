from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
import hashlib

from django.db import transaction
from django.utils import timezone
from django.utils.html import escape

from apps.billing.models import AGTInvoice, KwanzaPayment

IVA_RATE_AO = Decimal('14.00')
IVA_DIVISOR = Decimal('1.14')
DEFAULT_SERIES = 'FT YE2026'


def calculate_iva_breakdown(total_aoa: Decimal) -> tuple[Decimal, Decimal, Decimal]:
    """Calcula base tributável, IVA (14%) e total a partir do valor final em AOA."""
    total = total_aoa.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    subtotal = (total / IVA_DIVISOR).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    iva_amount = (total - subtotal).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return subtotal, iva_amount, total


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
    Emite uma Fatura Eletrónica compatível com AGT (Angola) com numeração sequencial,
    IVA 14%, hash encadeado SHA-256 e estrutura SAF-T (AO). Idempotente por pagamento.
    """
    existing = AGTInvoice.objects.filter(payment=payment).first()
    if existing:
        return existing

    last_invoice = AGTInvoice.objects.select_for_update().order_by('-sequence_number').first()
    next_seq = (last_invoice.sequence_number + 1) if last_invoice else 1
    previous_hash = last_invoice.agt_hash if last_invoice else ''

    invoice_number = f"{DEFAULT_SERIES}/{next_seq:05d}"
    issue_date = timezone.now()
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
    issuer_nif = '5417098123'
    software_cert = 'AGT-CERT-YETUEDU-2026'

    qr_payload = (
        f"A:{issuer_nif}*B:{customer_nif}*C:AO*D:FT*E:N*"
        f"F:{issue_date.strftime('%Y%m%d')}*G:{invoice_number}*"
        f"H:{hash_control}*I1:AO*I7:{subtotal_aoa:.2f}*I8:{iva_amount_aoa:.2f}*"
        f"N:{iva_amount_aoa:.2f}*O:{total_aoa:.2f}*Q:{hash_control}*R:{software_cert}"
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
                'Description': payment.description,
                'Quantity': 1,
                'UnitPrice': f"{subtotal_aoa:.2f}",
                'TaxPercentage': f"{IVA_RATE_AO:.2f}",
                'TaxAmount': f"{iva_amount_aoa:.2f}",
            }
        ],
        'DocumentTotals': {
            'TaxPayable': f"{iva_amount_aoa:.2f}",
            'NetTotal': f"{subtotal_aoa:.2f}",
            'GrossTotal': f"{total_aoa:.2f}",
            'CurrencyCode': 'AOA',
        },
    }

    return AGTInvoice.objects.create(
        school=payment.school,
        payment=payment,
        series=DEFAULT_SERIES,
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
        software_certificate_no=software_cert,
        qr_payload=qr_payload,
        saft_payload=saft_payload,
    )


def render_agt_invoice_html(invoice: AGTInvoice) -> str:
    """Gera HTML imprimível da Fatura AGT com escape estrito contra XSS."""
    payment = invoice.payment
    issue_str = timezone.localtime(invoice.issue_date).strftime('%d/%m/%Y %H:%M')

    return f"""<!DOCTYPE html>
<html lang="pt-AO">
<head>
  <meta charset="utf-8" />
  <title>Fatura {escape(invoice.invoice_number)} — YetuEdu AGT</title>
  <style>
    body {{ font-family: system-ui, -apple-system, sans-serif; color: #1c1917; max-width: 780px; margin: 32px auto; padding: 24px; line-height: 1.5; }}
    .header {{ display: flex; justify-content: space-between; border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 20px; }}
    .badge {{ display: inline-block; background: #ccfbf1; color: #115e59; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }}
    table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
    th, td {{ border: 1px solid #d6d3d1; padding: 10px; text-align: left; font-size: 14px; }}
    th {{ background: #f5f5f4; }}
    .totals {{ text-align: right; margin-top: 16px; }}
    .agt-box {{ margin-top: 24px; padding: 14px; background: #fafaf9; border: 1px dashed #a8a29e; font-size: 12px; word-break: break-all; }}
    @media print {{ .no-print {{ display: none; }} body {{ margin: 0; padding: 12px; }} }}
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;">
    <button onclick="window.print()" style="padding:8px 14px;background:#0f766e;color:#fff;border:none;border-radius:8px;cursor:pointer;">Imprimir / Guardar PDF</button>
  </div>
  <div class="header">
    <div>
      <h1 style="margin:0;font-size:20px;">{escape(invoice.issuer_name)}</h1>
      <p style="margin:4px 0;">NIF: <strong>{escape(invoice.issuer_nif)}</strong> &middot; Luanda, Angola</p>
      <span class="badge">Fatura Eletrónica AGT</span>
    </div>
    <div style="text-align:right;">
      <h2 style="margin:0;font-size:18px;">{escape(invoice.invoice_number)}</h2>
      <p style="margin:4px 0;">Emissão: {escape(issue_str)}</p>
      <p style="margin:4px 0;">Ref. Pagamento: <strong>{escape(payment.reference)}</strong></p>
    </div>
  </div>

  <p><strong>Adquirente:</strong> {escape(invoice.customer_name)}<br />
     <strong>NIF Adquirente:</strong> {escape(invoice.customer_nif)}<br />
     <strong>Método:</strong> {escape(payment.get_payment_method_display())}</p>

  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th>Base Tributável (AOA)</th>
        <th>IVA ({escape(str(invoice.iva_rate))}%)</th>
        <th>Total (AOA)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>{escape(payment.description)}</td>
        <td>{invoice.subtotal_aoa:,.2f} AOA</td>
        <td>{invoice.iva_amount_aoa:,.2f} AOA</td>
        <td><strong>{invoice.total_aoa:,.2f} AOA</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <p>Total Líquido: {invoice.subtotal_aoa:,.2f} AOA</p>
    <p>IVA (14%): {invoice.iva_amount_aoa:,.2f} AOA</p>
    <p style="font-size:18px;"><strong>Total Geral: {invoice.total_aoa:,.2f} AOA</strong></p>
  </div>

  <div class="agt-box">
    <p style="margin:0 0 6px 0;"><strong>{escape(invoice.hash_control)}-Processado por programa certificado n.º {escape(invoice.software_certificate_no)} / AGT</strong></p>
    <p style="margin:0 0 4px 0;">Hash SHA-256: <code>{escape(invoice.agt_hash)}</code></p>
    <p style="margin:0;">QR Fiscal AGT: <code>{escape(invoice.qr_payload)}</code></p>
  </div>
</body>
</html>
"""


def build_saft_export(school=None) -> dict:
    """Constrói resumo SAF-T (AO) das faturas emitidas (opcionalmente filtrado por escola)."""
    qs = AGTInvoice.objects.select_related('payment').order_by('sequence_number')
    if school is not None:
        qs = qs.filter(school=school)

    invoices = [inv.saft_payload for inv in qs]
    total_gross = sum((inv.total_aoa for inv in qs), Decimal('0.00'))
    return {
        'AuditFileVersion': '1.01_01',
        'Country': 'AO',
        'CurrencyCode': 'AOA',
        'TaxAccountingBasis': 'F',
        'CompanyName': 'YetuEdu Tecnologia Educacional, Lda.',
        'TaxRegistrationNumber': '5417098123',
        'NumberOfEntries': len(invoices),
        'TotalGrossAOA': f"{total_gross:.2f}",
        'Invoices': invoices,
    }
