from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import io
import xml.etree.ElementTree as ET

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.html import escape

from apps.billing.models import AGTInvoice, KwanzaPayment

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


def _render_qr_svg_optional(payload: str) -> str:
    """Gera QR Code vetorial inline se o pacote `qrcode` estiver disponível no backend."""
    try:
        import qrcode
        import qrcode.image.svg

        qr = qrcode.QRCode(border=1, box_size=4)
        qr.add_data(payload)
        qr.make(fit=True)
        img = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage)
        buf = io.BytesIO()
        img.save(buf)
        return buf.getvalue().decode('utf-8')
    except Exception:
        return ''


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


def render_agt_invoice_html(invoice: AGTInvoice) -> str:
    """Gera HTML imprimível da Fatura Eletrónica AGT com escape estrito contra XSS."""
    payment = invoice.payment
    issuer = get_issuer_config()
    issue_str = timezone.localtime(invoice.issue_date).strftime('%d/%m/%Y %H:%M')
    description = payment.description or 'Serviços de Plataforma Educacional EduLink'
    qr_svg = _render_qr_svg_optional(invoice.qr_payload)

    qr_block = (
        f'<div class="qr-visual" aria-label="QR Code Fiscal AGT">{qr_svg}</div>'
        if qr_svg
        else ''
    )

    return f"""<!DOCTYPE html>
<html lang="pt-AO">
<head>
  <meta charset="utf-8" />
  <title>Fatura {escape(invoice.invoice_number)} — EduLink AGT</title>
  <style>
    body {{ font-family: system-ui, -apple-system, sans-serif; color: #1c1917; max-width: 780px; margin: 32px auto; padding: 24px; line-height: 1.5; }}
    .header {{ display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #0f766e; padding-bottom: 16px; margin-bottom: 20px; }}
    .badge {{ display: inline-block; background: #ccfbf1; color: #115e59; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }}
    table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
    th, td {{ border: 1px solid #d6d3d1; padding: 10px; text-align: left; font-size: 14px; }}
    th {{ background: #f5f5f4; }}
    .num {{ text-align: right; white-space: nowrap; }}
    .totals {{ text-align: right; margin-top: 16px; }}
    .agt-box {{ margin-top: 24px; padding: 14px; background: #fafaf9; border: 1px dashed #a8a29e; font-size: 12px; display: flex; gap: 16px; align-items: center; }}
    .agt-meta {{ flex: 1; word-break: break-all; }}
    .qr-visual svg {{ width: 112px; height: 112px; display: block; }}
    @media print {{ .no-print {{ display: none; }} body {{ margin: 0; padding: 12px; }} }}
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;">
    <button onclick="window.print()" style="padding:8px 14px;background:#0f766e;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Imprimir / Guardar PDF</button>
  </div>
  <div class="header">
    <div>
      <h1 style="margin:0;font-size:20px;">{escape(invoice.issuer_name)}</h1>
      <p style="margin:4px 0;">NIF: <strong>{escape(invoice.issuer_nif)}</strong> &middot; {escape(issuer['city'])}, Angola</p>
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
     <strong>Canal de Liquidação:</strong> {escape(payment.get_payment_method_display())}</p>

  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th class="num">Base Tributável</th>
        <th class="num">IVA ({escape(str(invoice.iva_rate))}%)</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>{escape(description)}</td>
        <td class="num">{escape(format_aoa(invoice.subtotal_aoa))}</td>
        <td class="num">{escape(format_aoa(invoice.iva_amount_aoa))}</td>
        <td class="num"><strong>{escape(format_aoa(invoice.total_aoa))}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <p>Total Líquido: {escape(format_aoa(invoice.subtotal_aoa))}</p>
    <p>IVA ({escape(str(invoice.iva_rate))}%): {escape(format_aoa(invoice.iva_amount_aoa))}</p>
    <p style="font-size:18px;"><strong>Total Geral: {escape(format_aoa(invoice.total_aoa))}</strong></p>
  </div>

  <div class="agt-box">
    {qr_block}
    <div class="agt-meta">
      <p style="margin:0 0 6px 0;"><strong>{escape(invoice.hash_control)}-Processado por programa certificado n.º {escape(invoice.software_certificate_no)} / AGT</strong></p>
      <p style="margin:0 0 4px 0;">Hash SHA-256: <code>{escape(invoice.agt_hash)}</code></p>
      <p style="margin:0;">QR Fiscal AGT: <code>{escape(invoice.qr_payload)}</code></p>
    </div>
  </div>
</body>
</html>
"""


def build_saft_export(school=None) -> dict:
    """Constrói resumo estruturado SAF-T (AO) em JSON das faturas emitidas."""
    issuer = get_issuer_config()
    qs = AGTInvoice.objects.select_related('payment').order_by('series', 'sequence_number')
    if school is not None:
        qs = qs.filter(school=school)

    invoices = [inv.saft_payload for inv in qs]
    total_gross = sum((inv.total_aoa for inv in qs), Decimal('0.00'))
    return {
        'AuditFileVersion': '1.01_01',
        'Country': 'AO',
        'CurrencyCode': 'AOA',
        'TaxAccountingBasis': 'F',
        'CompanyName': issuer['name'],
        'TaxRegistrationNumber': issuer['nif'],
        'NumberOfEntries': len(invoices),
        'TotalGrossAOA': f'{total_gross:.2f}',
        'Invoices': invoices,
    }


def build_saft_xml(
    school=None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> str:
    """
    Gera ficheiro XML SAF-T (AO) versão 1.01_01 compatível com a estrutura
    exigida pela Administração Geral Tributária (AGT) de Angola.
    """
    issuer = get_issuer_config()
    qs = AGTInvoice.objects.select_related('payment', 'school').order_by('series', 'sequence_number')
    if school is not None:
        qs = qs.filter(school=school)
    if start_date is not None:
        qs = qs.filter(issue_date__date__gte=start_date)
    if end_date is not None:
        qs = qs.filter(issue_date__date__lte=end_date)

    invoices = list(qs)
    today = timezone.localdate()
    period_start = start_date or (
        timezone.localtime(invoices[0].issue_date).date() if invoices else today.replace(day=1)
    )
    period_end = end_date or (
        timezone.localtime(invoices[-1].issue_date).date() if invoices else today
    )

    root = ET.Element('AuditFile', {'xmlns': SAFT_XML_NAMESPACE})

    # 1. Header
    header = ET.SubElement(root, 'Header')
    ET.SubElement(header, 'AuditFileVersion').text = '1.01_01'
    ET.SubElement(header, 'CompanyID').text = issuer['nif']
    ET.SubElement(header, 'TaxRegistrationNumber').text = issuer['nif']
    ET.SubElement(header, 'TaxAccountingBasis').text = 'F'
    ET.SubElement(header, 'CompanyName').text = issuer['name']
    company_addr = ET.SubElement(header, 'CompanyAddress')
    ET.SubElement(company_addr, 'AddressDetail').text = issuer['address']
    ET.SubElement(company_addr, 'City').text = issuer['city']
    ET.SubElement(company_addr, 'Country').text = 'AO'
    ET.SubElement(header, 'FiscalYear').text = str(period_end.year)
    ET.SubElement(header, 'StartDate').text = period_start.isoformat()
    ET.SubElement(header, 'EndDate').text = period_end.isoformat()
    ET.SubElement(header, 'CurrencyCode').text = 'AOA'
    ET.SubElement(header, 'DateCreated').text = today.isoformat()
    ET.SubElement(header, 'TaxEntity').text = 'Global'
    ET.SubElement(header, 'ProductCompanyTaxID').text = issuer['nif']
    ET.SubElement(header, 'SoftwareValidationNumber').text = issuer['software_cert']
    ET.SubElement(header, 'ProductID').text = 'EduLink/AGT-Invoicing'
    ET.SubElement(header, 'ProductVersion').text = '1.0'

    # 2. MasterFiles (Clientes únicos presentes nas faturas)
    master_files = ET.SubElement(root, 'MasterFiles')
    seen_customers: set[str] = set()
    for inv in invoices:
        cust_id = str(inv.school_id) if inv.school_id else inv.customer_nif
        if cust_id in seen_customers:
            continue
        seen_customers.add(cust_id)
        customer = ET.SubElement(master_files, 'Customer')
        ET.SubElement(customer, 'CustomerID').text = cust_id
        ET.SubElement(customer, 'AccountID').text = 'Desconhecido'
        ET.SubElement(customer, 'CustomerTaxID').text = inv.customer_nif
        ET.SubElement(customer, 'CompanyName').text = inv.customer_name
        billing_addr = ET.SubElement(customer, 'BillingAddress')
        ET.SubElement(billing_addr, 'AddressDetail').text = (
            inv.school.address if inv.school and inv.school.address else 'Angola'
        )
        ET.SubElement(billing_addr, 'City').text = (
            inv.school.province if inv.school and inv.school.province else 'Luanda'
        )
        ET.SubElement(billing_addr, 'Country').text = 'AO'
        ET.SubElement(customer, 'SelfBillingIndicator').text = '0'

    # 3. SourceDocuments -> SalesInvoices
    source_docs = ET.SubElement(root, 'SourceDocuments')
    sales_invoices = ET.SubElement(source_docs, 'SalesInvoices')
    total_credit = sum((inv.subtotal_aoa for inv in invoices), Decimal('0.00'))

    ET.SubElement(sales_invoices, 'NumberOfEntries').text = str(len(invoices))
    ET.SubElement(sales_invoices, 'TotalDebit').text = '0.00'
    ET.SubElement(sales_invoices, 'TotalCredit').text = f'{total_credit:.2f}'

    for inv in invoices:
        local_dt = timezone.localtime(inv.issue_date)
        inv_el = ET.SubElement(sales_invoices, 'Invoice')
        ET.SubElement(inv_el, 'InvoiceNo').text = inv.invoice_number

        doc_status = ET.SubElement(inv_el, 'DocumentStatus')
        ET.SubElement(doc_status, 'InvoiceStatus').text = 'N'
        ET.SubElement(doc_status, 'InvoiceStatusDate').text = local_dt.strftime('%Y-%m-%dT%H:%M:%S')
        ET.SubElement(doc_status, 'SourceID').text = 'edulink'
        ET.SubElement(doc_status, 'SourceBilling').text = 'P'

        ET.SubElement(inv_el, 'Hash').text = inv.agt_hash
        ET.SubElement(inv_el, 'HashControl').text = inv.hash_control
        ET.SubElement(inv_el, 'Period').text = str(local_dt.month)
        ET.SubElement(inv_el, 'InvoiceDate').text = local_dt.strftime('%Y-%m-%d')
        ET.SubElement(inv_el, 'InvoiceType').text = 'FT'
        ET.SubElement(inv_el, 'SystemEntryDate').text = local_dt.strftime('%Y-%m-%dT%H:%M:%S')
        ET.SubElement(inv_el, 'CustomerID').text = str(inv.school_id) if inv.school_id else inv.customer_nif

        line = ET.SubElement(inv_el, 'Line')
        ET.SubElement(line, 'LineNumber').text = '1'
        ET.SubElement(line, 'ProductCode').text = 'EDULINK-SVC'
        ET.SubElement(line, 'ProductDescription').text = (
            inv.payment.description or 'Serviços de Plataforma Educacional EduLink'
        )
        ET.SubElement(line, 'Quantity').text = '1'
        ET.SubElement(line, 'UnitOfMeasure').text = 'UN'
        ET.SubElement(line, 'UnitPrice').text = f'{inv.subtotal_aoa:.2f}'
        ET.SubElement(line, 'TaxPointDate').text = local_dt.strftime('%Y-%m-%d')
        ET.SubElement(line, 'Description').text = (
            inv.payment.description or 'Serviços de Plataforma Educacional EduLink'
        )
        ET.SubElement(line, 'CreditAmount').text = f'{inv.subtotal_aoa:.2f}'

        tax = ET.SubElement(line, 'Tax')
        ET.SubElement(tax, 'TaxType').text = 'IVA'
        ET.SubElement(tax, 'TaxCountryRegion').text = 'AO'
        ET.SubElement(tax, 'TaxCode').text = 'NOR'
        ET.SubElement(tax, 'TaxPercentage').text = f'{inv.iva_rate:.2f}'

        totals = ET.SubElement(inv_el, 'DocumentTotals')
        ET.SubElement(totals, 'TaxPayable').text = f'{inv.iva_amount_aoa:.2f}'
        ET.SubElement(totals, 'NetTotal').text = f'{inv.subtotal_aoa:.2f}'
        ET.SubElement(totals, 'GrossTotal').text = f'{inv.total_aoa:.2f}'

    return ET.tostring(root, encoding='utf-8', xml_declaration=True).decode('utf-8')