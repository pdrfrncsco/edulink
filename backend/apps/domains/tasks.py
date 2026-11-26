import logging
from celery import shared_task

from apps.domains.models import DomainConfiguration
from apps.domains.services.blueprint import generate_dns_blueprint
from apps.domains.services.cloudflare_service import CloudflareDNSService, CloudflareError
from apps.domains.services.dns_checker import check_domain_propagation

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def provision_school_dns_task(self, domain_config_id: str, providers: list[str] | None = None):
    """
    Worker assíncrono que gera o blueprint DNS da escola (.edu.ao)
    e sincroniza a zona e registos na Cloudflare API.
    """
    domain_config = DomainConfiguration.objects.select_related('school').filter(id=domain_config_id).first()
    if not domain_config:
        logger.warning("DomainConfiguration %s não encontrada.", domain_config_id)
        return False

    if not domain_config.records.exists():
        generate_dns_blueprint(domain_config, providers=providers)

    service = CloudflareDNSService.for_domain_config(domain_config)
    try:
        result = service.sync_domain_configuration(domain_config)
        logger.info("DNS sincronizado na Cloudflare para %s: %s", domain_config.school.domain, result)
        return result
    except CloudflareError as exc:
        domain_config.registrar_status = DomainConfiguration.RegistrarStatus.ERROR
        domain_config.last_error = str(exc)
        domain_config.save(update_fields=['registrar_status', 'last_error'])
        if exc.retryable:
            raise self.retry(exc=exc)
        raise exc


@shared_task
def verify_dns_propagation_task(domain_config_id: str):
    """Worker assíncrono para verificar propagação pública via DoH."""
    domain_config = DomainConfiguration.objects.select_related('school').filter(id=domain_config_id).first()
    if not domain_config:
        return None
    return check_domain_propagation(domain_config)
