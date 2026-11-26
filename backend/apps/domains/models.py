from django.conf import settings
from django.db import models
from apps.core.crypto import decrypt_text, encrypt_text
from apps.core.models import TimeStampedModel, UUIDModel
from apps.tenants.models import School


class DomainConfiguration(UUIDModel, TimeStampedModel):
    """
    Configuração da zona DNS (.edu.ao) de uma escola, delegação de nameservers
    para a Cloudflare e tokens de verificação (Google Workspace / Microsoft 365).
    """
    class RegistrarStatus(models.TextChoices):
        PENDING_DNS_AO = 'PENDING_DNS_AO', 'Aguardando Registo DNS.AO'
        NAMESERVERS_DELEGATED = 'NAMESERVERS_DELEGATED', 'Nameservers Delegados à Cloudflare'
        ACTIVE = 'ACTIVE', 'Zona Ativa e Propagada'
        ERROR = 'ERROR', 'Erro de Sincronização DNS'

    school = models.OneToOneField(
        School,
        on_delete=models.CASCADE,
        related_name='dns_config',
        verbose_name='Escola (Tenant)',
    )
    registrar_status = models.CharField(
        max_length=30,
        choices=RegistrarStatus.choices,
        default=RegistrarStatus.PENDING_DNS_AO,
        verbose_name='Estado DNS.AO / Cloudflare',
    )
    cloudflare_zone_id = models.CharField(
        max_length=64,
        blank=True,
        verbose_name='Cloudflare Zone ID',
    )
    cloudflare_account_id = models.CharField(
        max_length=64,
        blank=True,
        verbose_name='Cloudflare Account ID',
    )
    encrypted_api_token = models.TextField(
        blank=True,
        verbose_name='Token API Cloudflare (Encriptado)',
        help_text='Opcional por escola; se vazio utiliza o token da plataforma EduLink',
    )
    nameservers = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Nameservers Cloudflare',
        help_text='Servidores NS atribuídos para submeter ao Registrar DNS.AO',
    )
    google_verification_token = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Token TXT Google Workspace',
        help_text='Ex: google-site-verification=...',
    )
    microsoft_verification_token = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Token TXT Microsoft 365',
        help_text='Ex: MS=ms12345678',
    )
    dkim_selector = models.CharField(
        max_length=64,
        default='google',
        blank=True,
        verbose_name='Seletor DKIM',
    )
    dkim_public_key = models.TextField(
        blank=True,
        verbose_name='Chave Pública DKIM (TXT)',
    )
    target_web_ip_or_cname = models.CharField(
        max_length=255,
        default=getattr(settings, 'EDULINK_WEB_TARGET', 'sites.edulink.ao'),
        verbose_name='Destino Web (IPv4 ou CNAME)',
        help_text='Endereço IPv4 ou hostname CNAME do proxy reverso Next.js',
    )
    last_synced_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Última Sincronização Cloudflare',
    )
    last_error = models.TextField(
        blank=True,
        verbose_name='Último Erro DNS',
    )

    class Meta:
        verbose_name = 'Configuração DNS (.edu.ao)'
        verbose_name_plural = 'Configurações DNS (.edu.ao)'
        ordering = ['school__domain']

    def __str__(self):
        return f"{self.school.domain} [{self.get_registrar_status_display()}]"

    def set_api_token(self, plain_token: str) -> None:
        self.encrypted_api_token = encrypt_text((plain_token or '').strip())

    def get_api_token(self) -> str:
        if not self.encrypted_api_token:
            return ''
        return decrypt_text(self.encrypted_api_token)


class DNSRecord(UUIDModel, TimeStampedModel):
    """
    Registo DNS individual (A, CNAME, MX, TXT) gerido na zona Cloudflare
    para a escola e verificado via DNS-over-HTTPS.
    """
    class RecordType(models.TextChoices):
        A = 'A', 'A'
        AAAA = 'AAAA', 'AAAA'
        CNAME = 'CNAME', 'CNAME'
        MX = 'MX', 'MX'
        TXT = 'TXT', 'TXT'

    class Purpose(models.TextChoices):
        WEB = 'WEB', 'Site Institucional (.edu.ao)'
        GOOGLE_VERIFY = 'GOOGLE_VERIFY', 'Verificação Google Workspace'
        MICROSOFT_VERIFY = 'MICROSOFT_VERIFY', 'Verificação Microsoft 365'
        MX_GOOGLE = 'MX_GOOGLE', 'Correio MX Google'
        MX_MICROSOFT = 'MX_MICROSOFT', 'Correio MX Microsoft'
        SPF = 'SPF', 'Autenticação SPF'
        DKIM = 'DKIM', 'Assinatura DKIM'
        DMARC = 'DMARC', 'Política DMARC'
        CUSTOM = 'CUSTOM', 'Personalizado'

    class SyncState(models.TextChoices):
        PENDING = 'PENDING', 'Pendente'
        SYNCED = 'SYNCED', 'Sincronizado'
        FAILED = 'FAILED', 'Falhou'

    domain_config = models.ForeignKey(
        DomainConfiguration,
        on_delete=models.CASCADE,
        related_name='records',
        verbose_name='Configuração DNS',
    )
    record_type = models.CharField(
        max_length=10,
        choices=RecordType.choices,
        verbose_name='Tipo',
    )
    name = models.CharField(
        max_length=255,
        verbose_name='Nome / Host',
        help_text='Ex: @, www, google._domainkey, _dmarc',
    )
    content = models.TextField(verbose_name='Valor / Conteúdo')
    ttl = models.PositiveIntegerField(
        default=3600,
        verbose_name='TTL (segundos)',
    )
    priority = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Prioridade (MX)',
    )
    proxied = models.BooleanField(
        default=False,
        verbose_name='Proxy Cloudflare Ativo',
    )
    purpose = models.CharField(
        max_length=30,
        choices=Purpose.choices,
        default=Purpose.CUSTOM,
        verbose_name='Finalidade',
    )
    cloudflare_record_id = models.CharField(
        max_length=64,
        blank=True,
        verbose_name='Cloudflare Record ID',
    )
    sync_state = models.CharField(
        max_length=20,
        choices=SyncState.choices,
        default=SyncState.PENDING,
        verbose_name='Estado na Cloudflare',
    )
    propagated = models.BooleanField(
        default=False,
        verbose_name='Propagado Publicamente',
    )
    last_checked_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Última Verificação DoH',
    )

    class Meta:
        verbose_name = 'Registo DNS'
        verbose_name_plural = 'Registos DNS'
        ordering = ['record_type', 'name', 'purpose']
        unique_together = ('domain_config', 'record_type', 'name', 'purpose')

    def __str__(self):
        return f"{self.record_type} {self.name} -> {self.content[:40]}"
