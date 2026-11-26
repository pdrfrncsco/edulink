from datetime import timedelta
from decimal import Decimal
import hashlib
import hmac
import secrets

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.billing.models import (
    AGTInvoice,
    KwanzaPayment,
    PLAN_CATALOG,
    SchoolSubscription,
)
from apps.billing.services.agt_invoicing import issue_agt_invoice


def _generate_payment_reference(payment_method: str) -> str:
    if payment_method == KwanzaPayment.Method.MULTICAIXA_EXPRESS:
        digits = ''.join(secrets.choice('0123456789') for _ in range(9))
        return f"MCX-{digits}"
    if payment_method == KwanzaPayment.Method.KWIK:
        return f"KWK-{secrets.token_hex(4).upper()}"
    return f"IBAN-{secrets.token_hex(4).upper()}"


def initiate_kwanza_payment(
    *,
    amount_aoa: Decimal,
    payment_method: str,
    description: str,
    school=None,
    subscription=None,
    academic_user=None,
    benefit_offer=None,
    customer_phone: str = '',
    customer_name: str = '',
    customer_nif: str = '',
) -> KwanzaPayment:
    """Cria uma intenção de pagamento em Kwanzas com referência única Multicaixa/KWiK."""
    reference = _generate_payment_reference(payment_method)
    while KwanzaPayment.objects.filter(reference=reference).exists():
        reference = _generate_payment_reference(payment_method)

    return KwanzaPayment.objects.create(
        school=school,
        subscription=subscription,
        academic_user=academic_user,
        benefit_offer=benefit_offer,
        reference=reference,
        payment_method=payment_method,
        amount_aoa=amount_aoa,
        description=description,
        customer_phone=customer_phone,
        customer_name=customer_name,
        customer_nif=customer_nif,
        status=KwanzaPayment.Status.PENDING,
    )


def verify_gateway_signature(raw_body: bytes, signature_header: str) -> bool:
    """Valida assinatura HMAC-SHA256 do webhook de pagamento em Kwanzas."""
    if not signature_header:
        return False
    secret = getattr(settings, 'KWANZA_GATEWAY_WEBHOOK_SECRET', 'yetuedu-kwanza-dev-secret')
    expected = hmac.new(secret.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()
    provided = signature_header.replace('sha256=', '').strip()
    return hmac.compare_digest(expected, provided)


@transaction.atomic
def confirm_kwanza_payment(
    payment: KwanzaPayment,
    *,
    gateway_transaction_id: str = '',
    webhook_payload: dict | None = None,
) -> tuple[KwanzaPayment, AGTInvoice]:
    """
    Confirma um pagamento em Kwanzas, ativa a subscrição escolar associada (se houver)
    e emite a respetiva Fatura Eletrónica AGT com hash encadeado.
    """
    locked_payment = KwanzaPayment.objects.select_for_update().get(id=payment.id)
    if locked_payment.status != KwanzaPayment.Status.CONFIRMED:
        now = timezone.now()
        locked_payment.status = KwanzaPayment.Status.CONFIRMED
        locked_payment.confirmed_at = now
        locked_payment.gateway_transaction_id = (
            gateway_transaction_id or f"GW-{secrets.token_hex(6).upper()}"
        )
        if webhook_payload is not None:
            locked_payment.webhook_payload = webhook_payload
        locked_payment.save(
            update_fields=['status', 'confirmed_at', 'gateway_transaction_id', 'webhook_payload', 'updated_at']
        )

        if locked_payment.subscription_id:
            sub = SchoolSubscription.objects.select_for_update().get(id=locked_payment.subscription_id)
            plan_info = PLAN_CATALOG.get(sub.plan_code, {'duration_days': 365})
            duration = plan_info.get('duration_days', 365)
            sub.status = SchoolSubscription.Status.ACTIVE
            sub.starts_at = now
            sub.expires_at = now + timedelta(days=duration)
            sub.save(update_fields=['status', 'starts_at', 'expires_at', 'updated_at'])

    invoice = issue_agt_invoice(locked_payment)
    return locked_payment, invoice
