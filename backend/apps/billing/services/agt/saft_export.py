from datetime import date
from decimal import Decimal
import xml.etree.ElementTree as ET

from django.utils import timezone

from apps.billing.models import AGTInvoice
from .common import SAFT_XML_NAMESPACE, get_issuer_config


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


def _append_saft_header(root: ET.Element, issuer: dict, period_start: date, period_end: date, today: date) -> None:
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


def _append_saft_customers(root: ET.Element, invoices: list[AGTInvoice]) -> None:
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


def _append_saft_sales_invoices(root: ET.Element, invoices: list[AGTInvoice]) -> None:
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
    _append_saft_header(root, issuer, period_start, period_end, today)
    _append_saft_customers(root, invoices)
    _append_saft_sales_invoices(root, invoices)
    return ET.tostring(root, encoding='utf-8', xml_declaration=True).decode('utf-8')
