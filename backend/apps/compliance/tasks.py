from celery import shared_task

from apps.compliance.models import ParentalConsent
from apps.core.notifications import send_parental_consent_email


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_parental_consent_email_task(self, consent_id: str, recipient_email: str = ''):
    """Envia de forma assíncrona o termo de consentimento parental ao encarregado."""
    consent = ParentalConsent.objects.select_related('school', 'student').filter(id=consent_id).first()
    if not consent:
        return {'status': 'not_found', 'consent_id': consent_id}
    try:
        return send_parental_consent_email(consent, recipient_email=recipient_email or None)
    except ValueError as exc:
        return {'status': 'skipped', 'reason': str(exc)}
    except Exception as exc:
        raise self.retry(exc=exc)
