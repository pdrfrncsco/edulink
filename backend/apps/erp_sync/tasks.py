import logging
from celery import shared_task

from apps.erp_sync.models import ERPSyncEvent
from apps.erp_sync.services.processor import process_erp_event

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def process_erp_webhook_event_task(self, event_id: str):
    """Processa assincronamente um evento recebido de KLASSE, SysPortal ou Kacennu."""
    event = ERPSyncEvent.objects.select_related('connection', 'school').filter(id=event_id).first()
    if not event:
        logger.warning("ERPSyncEvent %s não encontrado.", event_id)
        return False

    processed = process_erp_event(event)
    return processed.processing_status
