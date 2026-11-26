import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.html import escape

logger = logging.getLogger(__name__)


def send_edulink_email(
    *,
    subject: str,
    to_emails: list[str],
    text_body: str,
    html_body: str | None = None,
) -> int:
    """Envia um e-mail transacional EduLink (texto simples + HTML opcional)."""
    clean_recipients = [e.strip() for e in to_emails if e and e.strip()]
    if not clean_recipients:
        raise ValueError('Nenhum endereço de e-mail válido fornecido.')

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'EduLink Angola <no-reply@edulink.ao>'),
        to=clean_recipients,
    )
    if html_body:
        msg.attach_alternative(html_body, 'text/html')
    return msg.send(fail_silently=False)


def _public_base_url() -> str:
    return getattr(settings, 'EDULINK_PUBLIC_BASE_URL', 'http://localhost:3000').rstrip('/')


def send_parental_consent_email(consent, recipient_email: str | None = None) -> dict:
    """
    Envia o link único de assinatura digital do Termo de Consentimento Parental (APD)
    ao Encarregado de Educação (ou e-mail pessoal registado do estudante).
    """
    target_email = (
        (recipient_email or '').strip()
        or (consent.guardian_email or '').strip()
        or (consent.student.personal_email or '').strip()
    )
    if not target_email:
        raise ValueError('Indique um e-mail do Encarregado de Educação para enviar o termo.')

    if recipient_email and recipient_email.strip() and consent.guardian_email != recipient_email.strip():
        consent.guardian_email = recipient_email.strip()
        consent.save(update_fields=['guardian_email'])

    consent_url = f"{_public_base_url()}/consent?token={consent.consent_token}"
    school_name = consent.school.name
    student_name = consent.student.full_name

    subject = f"[{school_name}] Assinatura de Consentimento Parental (APD) — {student_name}"
    text_body = (
        f"Exmo(a). Encarregado(a) de Educação,\n\n"
        f"A instituição {school_name} solicita a sua assinatura digital no Termo de Consentimento Parental "
        f"(ao abrigo da Lei n.º 22/11 da Proteção de Dados / APD) para o(a) estudante {student_name}.\n\n"
        f"Aceda ao formulário seguro no link abaixo:\n{consent_url}\n\n"
        f"E-mail institucional atribuído: {consent.student.institutional_email}\n\n"
        f"Com os melhores cumprimentos,\nEquipa {school_name} via EduLink Angola"
    )
    html_body = f"""<!DOCTYPE html>
<html lang="pt-AO">
<body style="font-family:system-ui,-apple-system,sans-serif;color:#1c1917;line-height:1.6;max-width:600px;margin:24px auto;padding:20px;">
  <div style="border-bottom:2px solid #0f766e;padding-bottom:12px;margin-bottom:16px;">
    <strong style="color:#0f766e;font-size:16px;">EduLink Angola &middot; {escape(school_name)}</strong>
  </div>
  <p>Exmo(a). Encarregado(a) de Educação,</p>
  <p>Para ativação das contas académicas de <strong>{escape(student_name)}</strong> ({escape(consent.student.institutional_email)}) e cumprimento da <strong>Lei n.º 22/11 (APD)</strong>, solicitamos a assinatura digital do Termo de Consentimento Parental:</p>
  <p style="margin:24px 0;">
    <a href="{escape(consent_url)}" style="background:#0f766e;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;">
      Assinar Termo de Consentimento
    </a>
  </p>
  <p style="font-size:12px;color:#57534e;">Ou copie o link: <br /><code>{escape(consent_url)}</code></p>
</body>
</html>"""

    sent_count = send_edulink_email(
        subject=subject,
        to_emails=[target_email],
        text_body=text_body,
        html_body=html_body,
    )
    return {'sent': sent_count, 'recipient': target_email, 'consent_url': consent_url}


def send_academic_activation_email(academic_user, recipient_email: str | None = None) -> dict:
    """
    Envia instruções de ativação da conta institucional (.edu.ao) e Passaporte Digital
    para o estudante ou docente no Portal PWA.
    """
    target_email = (
        (recipient_email or '').strip()
        or (academic_user.personal_email or '').strip()
        or (academic_user.institutional_email or '').strip()
    )
    if not target_email:
        raise ValueError('Utilizador sem endereço de e-mail para envio de convite.')

    portal_url = f"{_public_base_url()}/portal"
    school_name = academic_user.school.name

    subject = f"[{school_name}] Ative o seu Passaporte Digital e E-mail .edu.ao"
    text_body = (
        f"Olá {academic_user.full_name},\n\n"
        f"A sua conta institucional na {school_name} foi criada na plataforma EduLink.\n\n"
        f"Para ativar a sua palavra-passe e aceder ao Passaporte Académico Digital:\n"
        f"1. Aceda a: {portal_url}\n"
        f"2. Clique em 'Ativar Conta Institucional (.edu.ao)'\n"
        f"3. E-mail institucional: {academic_user.institutional_email}\n"
        f"4. N.º de BI / Processo: {academic_user.bi_or_student_id}\n\n"
        f"Equipa {school_name} · EduLink Angola"
    )
    html_body = f"""<!DOCTYPE html>
<html lang="pt-AO">
<body style="font-family:system-ui,-apple-system,sans-serif;color:#1c1917;line-height:1.6;max-width:600px;margin:24px auto;padding:20px;">
  <div style="border-bottom:2px solid #0f766e;padding-bottom:12px;margin-bottom:16px;">
    <strong style="color:#0f766e;font-size:16px;">EduLink Angola &middot; {escape(school_name)}</strong>
  </div>
  <p>Olá <strong>{escape(academic_user.full_name)}</strong>,</p>
  <p>A sua conta académica está pronta. Utilize os dados abaixo para definir a sua palavra-passe e emitir o seu Passaporte Digital QR:</p>
  <ul style="background:#f5f5f4;padding:14px 20px;border-radius:10px;list-style:none;">
    <li><strong>E-mail Institucional:</strong> <code>{escape(academic_user.institutional_email)}</code></li>
    <li><strong>BI / Processo:</strong> <code>{escape(academic_user.bi_or_student_id)}</code></li>
  </ul>
  <p style="margin:24px 0;">
    <a href="{escape(portal_url)}" style="background:#0f766e;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;">
      Ativar Conta no Portal PWA
    </a>
  </p>
</body>
</html>"""

    sent_count = send_edulink_email(
        subject=subject,
        to_emails=[target_email],
        text_body=text_body,
        html_body=html_body,
    )
    return {'sent': sent_count, 'recipient': target_email, 'portal_url': portal_url}


def send_secretary_welcome_email(user) -> None:
    """Envia mensagem de boas-vindas ao responsável escolar registado (best-effort)."""
    if not user.email:
        return
    admin_url = f"{_public_base_url()}/admin"
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username
    try:
        send_edulink_email(
            subject='Bem-vindo à EduLink Angola — Registe a sua Instituição .edu.ao',
            to_emails=[user.email],
            text_body=(
                f"Olá {full_name},\n\n"
                f"A sua conta de Secretaria Escolar foi criada com sucesso na EduLink.\n"
                f"Aceda ao painel de onboarding para registar a sua instituição: {admin_url}\n"
            ),
        )
    except Exception as exc:
        logger.warning('Falha ao enviar e-mail de boas-vindas para %s: %s', user.email, exc)
