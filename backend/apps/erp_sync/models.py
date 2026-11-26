import secrets
from django.db import models
from apps.core.crypto import decrypt_text, encrypt_text
from apps.core.models import TimeStampedModel, UUIDModel
from apps.directory.models import AcademicUser
from apps.tenants.models import School


class ERPConnection(UUIDModel, TimeStampedModel):
    """
    Ligação B2B2B entre a escola e o seu ERP administrativo angolano
    (KLASSE, SysPortal, Kacennu ou conector genérico) com segredo HMAC encriptado.
    """
    class Provider(models.TextChoices):
        KLASSE = 'KLASSE', 'KLASSE ERP'
        SYSPORTAL = 'SYSPORTAL', 'SysPortal Académico'
        KACENNU = 'KACENNU', 'Kacennu Gestão Escolar'
        GENERIC = 'GENERIC', 'Webhook Genérico JSON'

    class SyncStatus(models.TextChoices):
        IDLE = 'IDLE', 'Aguardando Eventos'
        SUCCESS = 'SUCCESS', 'Sincronizado'
        ERROR = 'ERROR', 'Erro de Sincronização'

    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='erp_connections',
        verbose_name='Escola (Tenant)',
    )
    provider = models.CharField(
        max_length=20,
        choices=Provider.choices,
        verbose_name='ERP Angolano',
    )
    api_base_url = models.URLField(
        blank=True,
        verbose_name='URL Base da API do ERP (opcional)',
    )
    encrypted_api_key = models.TextField(
        blank=True,
        verbose_name='API Key Encriptada (Polling)',
    )
    encrypted_webhook_secret = models.TextField(
        blank=True,
        verbose_name='Segredo HMAC Webhook (Encriptado)',
    )
    is_active = models.BooleanField(default=True, verbose_name='Conector Ativo')
    last_event_at = models.DateTimeField(null=True, blank=True, verbose_name='Último Evento Recebido')
    last_sync_status = models.CharField(
        max_length=20,
        choices=SyncStatus.choices,
        default=SyncStatus.IDLE,
        verbose_name='Estado da Sincronização',
    )
    last_error = models.TextField(blank=True, verbose_name='Último Erro')

    class Meta:
        verbose_name = 'Ligação ERP Local'
        verbose_name_plural = 'Ligações ERPs Locais'
        unique_together = ('school', 'provider')
        ordering = ['school__name', 'provider']

    def __str__(self):
        return f"{self.school.name} - {self.get_provider_display()}"

    def save(self, *args, **kwargs):
        if not self.encrypted_webhook_secret:
            self.set_webhook_secret(secrets.token_urlsafe(32))
        super().save(*args, **kwargs)

    def set_webhook_secret(self, plain_secret: str) -> None:
        self.encrypted_webhook_secret = encrypt_text((plain_secret or '').strip())

    def get_webhook_secret(self) -> str:
        if not self.encrypted_webhook_secret:
            return ''
        return decrypt_text(self.encrypted_webhook_secret)

    def set_api_key(self, plain_key: str) -> None:
        self.encrypted_api_key = encrypt_text((plain_key or '').strip()) if plain_key else ''

    def get_api_key(self) -> str:
        if not self.encrypted_api_key:
            return ''
        return decrypt_text(self.encrypted_api_key)


class ERPSyncEvent(UUIDModel, TimeStampedModel):
    """Registo auditável e idempotente de eventos recebidos dos ERPs locais."""
    class EventType(models.TextChoices):
        STUDENT_ENROLLED = 'STUDENT_ENROLLED', 'Matrícula / Renovação'
        TEACHER_ASSIGNED = 'TEACHER_ASSIGNED', 'Docente Atribuído'
        TUITION_OVERDUE = 'TUITION_OVERDUE', 'Propina em Atraso (Suspender)'
        TUITION_SETTLED = 'TUITION_SETTLED', 'Propina Regularizada (Reativar)'
        ENROLLMENT_TRANSFERRED = 'ENROLLMENT_TRANSFERRED', 'Transferência / Saída'

    class ProcessingStatus(models.TextChoices):
        RECEIVED = 'RECEIVED', 'Recebido'
        PROCESSED = 'PROCESSED', 'Processado'
        FAILED = 'FAILED', 'Falhou'
        IGNORED = 'IGNORED', 'Ignorado (Duplicado)'

    connection = models.ForeignKey(
        ERPConnection,
        on_delete=models.CASCADE,
        related_name='events',
        verbose_name='Ligação ERP',
    )
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='erp_events',
        verbose_name='Escola (Tenant)',
    )
    provider = models.CharField(max_length=20, verbose_name='Provedor ERP')
    event_id = models.CharField(max_length=120, blank=True, verbose_name='ID de Idempotência')
    event_type = models.CharField(
        max_length=30,
        choices=EventType.choices,
        default=EventType.STUDENT_ENROLLED,
        verbose_name='Tipo de Evento',
    )
    payload = models.JSONField(default=dict, verbose_name='Payload Bruto')
    processing_status = models.CharField(
        max_length=20,
        choices=ProcessingStatus.choices,
        default=ProcessingStatus.RECEIVED,
        verbose_name='Estado',
    )
    affected_user = models.ForeignKey(
        AcademicUser,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='erp_events',
        verbose_name='Utilizador Afetado',
    )
    detail = models.TextField(blank=True, verbose_name='Detalhes')
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name='Processado em')

    class Meta:
        verbose_name = 'Evento ERP'
        verbose_name_plural = 'Eventos ERP'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['school', 'provider', 'created_at']),
            models.Index(fields=['connection', 'event_id']),
        ]

    def __str__(self):
        return f"[{self.provider}] {self.event_type} ({self.processing_status})"
