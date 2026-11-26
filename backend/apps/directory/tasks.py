from celery import shared_task

from apps.core.notifications import send_academic_activation_email
from apps.directory.models import AcademicUser


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_academic_activation_email_task(self, user_id: str, recipient_email: str = ''):
    """Envia de forma assíncrona o convite de ativação da conta institucional (.edu.ao)."""
    academic_user = AcademicUser.objects.select_related('school').filter(id=user_id).first()
    if not academic_user:
        return {'status': 'not_found', 'user_id': user_id}
    try:
        return send_academic_activation_email(academic_user, recipient_email=recipient_email or None)
    except ValueError as exc:
        return {'status': 'skipped', 'reason': str(exc)}
    except Exception as exc:
        raise self.retry(exc=exc)
