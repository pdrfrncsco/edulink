import io

from django.utils import timezone
from django.utils.html import escape

from apps.billing.models import AGTInvoice
from .common import format_aoa, get_issuer_config


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
