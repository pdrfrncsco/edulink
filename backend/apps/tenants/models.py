import json
import re
from pathlib import Path

from cryptography.fernet import InvalidToken
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, RegexValidator
from django.db import models
from django.utils.text import slugify

from apps.core.crypto import decrypt_text, encrypt_text
from apps.core.models import TimeStampedModel, UUIDModel


nif_validator = RegexValidator(
    regex=r'^\d{9,10}[A-Za-z0-9]?$',
    message='O NIF de Angola deve conter entre 9 a 10 dígitos numéricos (com possível sufixo).'
)

# Aceita .edu.ao (preferencial), .ed.ao, domínios próprios já existentes (.co.ao, .ao, .com, .org, .net) e .localhost
domain_validator = RegexValidator(
    regex=r'^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:edu\.ao|ed\.ao|co\.ao|ao|com|org|net|localhost)$',
    message=(
        'Introduza um domínio válido em minúsculas (ex.: colegio-esperanca.edu.ao, '
        'escola.co.ao, escola.com ou colegio.localhost para testes).'
    )
)

hex_color_validator = RegexValidator(
    regex=r'^#[0-9A-Fa-f]{6}$',
    message='A cor primária deve estar em formato hexadecimal (ex.: #0D9488).'
)

RESERVED_PREVIEW_SLUGS = {
    'www', 'admin', 'ops', 'portal', 'api', 'auth', 'sso',
    'mail', 'webmail', 'docs', 'status', 'cdn', 'static', 'app',
}


def onboarding_document_upload_path(instance: 'OnboardingDocument', filename: str) -> str:
    ext = Path(filename).suffix.lower() or '.pdf'
    return f'tenants/{instance.school_id}/onboarding/{instance.doc_type.lower()}_{instance.id}{ext}'


class CloudCredentialDecryptionError(Exception):
    """Lançada quando uma credencial encriptada não pode ser lida (ex.: rotação de chave Fernet)."""


class School(UUIDModel, TimeStampedModel):
    """
    Entidade Central (Tenant) que isola os dados de cada instituição escolar.
    Suporta subdomínio instantâneo de demonstração ({preview_slug}.edulink.ao)
    e transição transparente para domínio definitivo (.edu.ao ou próprio).
    """

    class InstitutionType(models.TextChoices):
        MED_K12 = 'MED_K12', 'Ensino Primário, Secundário ou Técnico (MED — K-12)'
        MESCTI_HIGHER_ED = 'MESCTI_HIGHER_ED', 'Ensino Superior / Universidade / Instituto (MESCTI)'

    class SetupStage(models.TextChoices):
        NOT_STARTED = 'NOT_STARTED', 'Não Iniciado'
        PENDING_DOCS = 'PENDING_DOCS', 'Aguardando Documentos'
        SUBMITTED = 'SUBMITTED', 'Submetido / Em Revisão'
        APPROVED = 'APPROVED', 'Aprovado / Ativo'
        ACTION_REQUIRED = 'ACTION_REQUIRED', 'Ação Necessária'
        NOT_ELIGIBLE = 'NOT_ELIGIBLE', 'Não Elegível (Plano Pago)'

    name = models.CharField(max_length=255, verbose_name='Nome da Instituição')
    institution_type = models.CharField(
        max_length=24,
        choices=InstitutionType.choices,
        default=InstitutionType.MED_K12,
        verbose_name='Nível de Ensino / Tutela',
        help_text='Determina elegibilidade gratuita no Canva Educação (K-12) e fluxo de revisão.'
    )
    nif = models.CharField(
        max_length=20,
        unique=True,
        validators=[nif_validator],
        verbose_name='NIF Institucional'
    )
    alvara_med_mescti = models.CharField(
        max_length=100,
        verbose_name='Alvará MED / MESCTI',
        help_text='Número do Alvará, Despacho ou Decreto de Reconhecimento Oficial'
    )

    # Identidade de Domínio: Demo imediata + Domínio oficial (.edu.ao ou existente)
    preview_slug = models.SlugField(
        max_length=63,
        unique=True,
        blank=True,
        verbose_name='Slug de Pré-visualização (edulink.ao)',
        help_text='Gera imediatamente {slug}.edulink.ao para demonstração comercial.'
    )
    domain = models.CharField(
        max_length=120,
        unique=True,
        null=True,
        blank=True,
        validators=[domain_validator],
        verbose_name='Domínio Institucional Definitivo',
        help_text='Preferencialmente .edu.ao (ex.: colegio-esperanca.edu.ao). Opcional durante a demo.'
    )

    primary_color = models.CharField(
        max_length=7,
        default='#0D9488',
        validators=[hex_color_validator],
        verbose_name='Cor Primária (Hex)',
        help_text='Cor base para o site institucional e cartão digital do aluno'
    )
    logo_url = models.URLField(
        blank=True,
        null=True,
        verbose_name='URL do Logotipo'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='Ativo',
        help_text='Indica se a escola tem acesso ativo na plataforma EduLink'
    )

    # Dados de Contacto e Localização (Angola)
    contact_email = models.EmailField(
        verbose_name='E-mail Institucional de Contacto',
        help_text='Exibido publicamente no site escolar (ex.: secretaria@escola.edu.ao).'
    )
    director_external_email = models.EmailField(
        blank=True,
        verbose_name='E-mail Externo do Diretor / Responsável',
        help_text='Obrigatório para validação DNS.AO, Google Workspace e Microsoft (fora do domínio novo).'
    )
    phone = models.CharField(max_length=30, blank=True, verbose_name='Telefone da Secretaria')
    province = models.CharField(max_length=60, default='Luanda', verbose_name='Província')
    municipality = models.CharField(max_length=60, default='Talatona', verbose_name='Município')
    address = models.CharField(max_length=255, blank=True, verbose_name='Endereço Físico')
    about_text = models.TextField(
        blank=True,
        verbose_name='Texto Sobre a Instituição',
        help_text='Apresentação institucional exibida no site público'
    )

    # Pipeline Chave-na-Mão de Intermediação (Backoffice EduLink)
    dns_status = models.CharField(
        max_length=20,
        choices=SetupStage.choices,
        default=SetupStage.PENDING_DOCS,
        verbose_name='Estado Domínio / DNS.AO'
    )
    google_status = models.CharField(
        max_length=20,
        choices=SetupStage.choices,
        default=SetupStage.NOT_STARTED,
        verbose_name='Estado Google Workspace for Education'
    )
    microsoft_status = models.CharField(
        max_length=20,
        choices=SetupStage.choices,
        default=SetupStage.NOT_STARTED,
        verbose_name='Estado Microsoft 365 Education (A1)'
    )
    canva_status = models.CharField(
        max_length=20,
        choices=SetupStage.choices,
        default=SetupStage.NOT_STARTED,
        verbose_name='Estado Canva para Educação'
    )

    # Blindagem Regulatória APD (Lei n.º 22/11)
    apd_notified = models.BooleanField(
        default=False,
        verbose_name='Notificação APD Submetida'
    )
    apd_dossier_number = models.CharField(
        max_length=60,
        blank=True,
        verbose_name='N.º do Dossiê APD'
    )

    # Feature Flags por Tenant (Fases 2 e 3 desativadas por padrão no MVP piloto)
    enable_erp_sync = models.BooleanField(
        default=False,
        verbose_name='Ativar Sincronização ERP (Fase 2)'
    )
    enable_benefits_club = models.BooleanField(
        default=False,
        verbose_name='Ativar Clube de Benefícios Local (Fase 2/3)'
    )
    enable_online_payments = models.BooleanField(
        default=False,
        verbose_name='Ativar Pagamentos MCX / KWiK no Portal (Fase 3)'
    )

    class Meta:
        verbose_name = 'Escola (Tenant)'
        verbose_name_plural = 'Escolas (Tenants)'
        ordering = ['name']
        indexes = [
            models.Index(fields=['domain']),
            models.Index(fields=['preview_slug']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self) -> str:
        return f'{self.name} ({self.effective_site_host})'

    @property
    def is_canva_k12_eligible(self) -> bool:
        """Canva para Educação gratuito aplica-se apenas a instituições K-12 (MED)."""
        return self.institution_type == self.InstitutionType.MED_K12

    @property
    def effective_site_host(self) -> str:
        root_domain = getattr(settings, 'EDULINK_ROOT_DOMAIN', 'edulink.ao')
        if self.domain:
            return self.domain
        return f'{self.preview_slug}.{root_domain}'

    @staticmethod
    def normalize_host(raw_host: str | None) -> str | None:
        if not raw_host:
            return None
        cleaned = raw_host.strip().lower()
        cleaned = re.sub(r'^https?://', '', cleaned)
        cleaned = cleaned.split('/')[0].split(':')[0].rstrip('.')
        if cleaned.startswith('www.'):
            cleaned = cleaned[4:]
        return cleaned or None

    def _generate_unique_preview_slug(self) -> str:
        base_source = (self.domain.split('.')[0] if self.domain else self.name) or 'escola'
        base = slugify(base_source)[:55].strip('-') or 'escola'
        if base in RESERVED_PREVIEW_SLUGS:
            base = f'escola-{base}'[:55]

        candidate = base
        counter = 2
        while School.objects.exclude(pk=self.pk).filter(preview_slug=candidate).exists():
            suffix = f'-{counter}'
            candidate = f'{base[:63 - len(suffix)]}{suffix}'
            counter += 1
        return candidate

    def clean(self) -> None:
        super().clean()
        self.domain = self.normalize_host(self.domain)

        if self.preview_slug:
            self.preview_slug = slugify(self.preview_slug)[:63].strip('-')
            if self.preview_slug in RESERVED_PREVIEW_SLUGS:
                raise ValidationError({
                    'preview_slug': f'O subdomínio "{self.preview_slug}" é reservado pela plataforma EduLink.'
                })

        if self.institution_type == self.InstitutionType.MESCTI_HIGHER_ED:
            if self.canva_status == self.SetupStage.NOT_STARTED:
                self.canva_status = self.SetupStage.NOT_ELIGIBLE

    def save(self, *args, **kwargs) -> None:
        self.domain = self.normalize_host(self.domain)
        if not self.preview_slug:
            self.preview_slug = self._generate_unique_preview_slug()
        if (
            self.institution_type == self.InstitutionType.MESCTI_HIGHER_ED
            and self.canva_status == self.SetupStage.NOT_STARTED
        ):
            self.canva_status = self.SetupStage.NOT_ELIGIBLE
        super().save(*args, **kwargs)

    @classmethod
    def resolve_by_host(cls, raw_host: str, root_domain: str | None = None):
        """
        Resolve uma escola ativa a partir do cabeçalho Host (usado pelo Caddy On-Demand TLS
        e pelo gerador multi-domínio do Next.js). Suporta tanto domínio próprio quanto {slug}.edulink.ao.
        """
        host = cls.normalize_host(raw_host)
        if not host:
            return None

        root = (root_domain or getattr(settings, 'EDULINK_ROOT_DOMAIN', 'edulink.ao')).lower()
        school = cls.objects.filter(domain=host, is_active=True).first()
        if school:
            return school

        for suffix in (f'.{root}', '.localhost'):
            if host.endswith(suffix):
                slug = host[:-len(suffix)]
                if slug and '.' not in slug and slug not in RESERVED_PREVIEW_SLUGS:
                    return cls.objects.filter(preview_slug=slug, is_active=True).first()
        return None


class OnboardingDocument(UUIDModel, TimeStampedModel):
    """
    Armazena os comprovativos legais obrigatórios recolhidos durante o onboarding
    para submissão à DNS.AO, Google Workspace, Microsoft 365 e APD.
    """

    class DocumentType(models.TextChoices):
        ALVARA_MED_MESCTI = 'ALVARA_MED_MESCTI', 'Alvará / Despacho MED ou MESCTI'
        NIF_CARD = 'NIF_CARD', 'Cartão de Contribuinte (NIF)'
        DIRECTOR_BI = 'DIRECTOR_BI', 'Bilhete de Identidade (BI) do Diretor'
        TECHNICAL_MANDATE = 'TECHNICAL_MANDATE', 'Mandato Técnico / Autorização Assinada'
        APD_DOSSIER = 'APD_DOSSIER', 'Comprovativo de Notificação APD'

    class ReviewStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pendente de Validação'
        APPROVED = 'APPROVED', 'Validado'
        REJECTED = 'REJECTED', 'Rejeitado (Reenvio Necessário)'

    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='onboarding_documents',
        verbose_name='Escola'
    )
    doc_type = models.CharField(
        max_length=32,
        choices=DocumentType.choices,
        verbose_name='Tipo de Documento'
    )
    file = models.FileField(
        upload_to=onboarding_document_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'png', 'jpg', 'jpeg'])],
        verbose_name='Ficheiro Digitalizado (PDF/Imagem)'
    )
    status = models.CharField(
        max_length=16,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING,
        verbose_name='Estado da Revisão'
    )
    review_notes = models.TextField(blank=True, verbose_name='Observações da Equipa EduLink')
    verified_at = models.DateTimeField(null=True, blank=True, verbose_name='Validado em')
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='verified_onboarding_documents',
        verbose_name='Validado por'
    )

    class Meta:
        verbose_name = 'Documento de Onboarding'
        verbose_name_plural = 'Documentos de Onboarding'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['school', 'doc_type'],
                name='uniq_onboarding_doc_per_school_type'
            )
        ]

    def __str__(self) -> str:
        return f'{self.school.name} — {self.get_doc_type_display()} ({self.status})'


class CloudIntegration(UUIDModel, TimeStampedModel):
    """
    Armazena com segurança (AES-256 / Fernet) as credenciais de autenticação
    de cada escola nos provedores de nuvem (Google Workspace for Education e Microsoft 365).
    """

    class Provider(models.TextChoices):
        GOOGLE = 'GOOGLE', 'Google Workspace for Education'
        MICROSOFT = 'MICROSOFT', 'Microsoft 365 Education (A1/Entra ID)'

    class SyncStatus(models.TextChoices):
        IDLE = 'IDLE', 'Aguardando'
        SYNCING = 'SYNCING', 'Sincronizando'
        SUCCESS = 'SUCCESS', 'Sincronizado com Sucesso'
        ERROR = 'ERROR', 'Erro de Sincronização'

    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='cloud_integrations',
        verbose_name='Escola'
    )
    provider = models.CharField(
        max_length=20,
        choices=Provider.choices,
        verbose_name='Provedor de Nuvem'
    )
    encrypted_credentials = models.TextField(
        verbose_name='Credenciais Encriptadas (AES-256)',
        help_text='JSON da Service Account ou App Registration encriptado com Fernet'
    )
    sync_enabled = models.BooleanField(
        default=True,
        verbose_name='Sincronização Automática Ativa'
    )
    sync_status = models.CharField(
        max_length=20,
        choices=SyncStatus.choices,
        default=SyncStatus.IDLE,
        verbose_name='Estado de Sincronização'
    )
    last_sync_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Última Sincronização'
    )
    last_error_message = models.TextField(
        blank=True,
        verbose_name='Última Mensagem de Erro'
    )

    class Meta:
        verbose_name = 'Integração de Nuvem'
        verbose_name_plural = 'Integrações de Nuvem'
        constraints = [
            models.UniqueConstraint(
                fields=['school', 'provider'],
                name='uniq_cloud_integration_school_provider'
            )
        ]

    def __str__(self) -> str:
        return f'{self.school.name} - {self.get_provider_display()}'

    def set_credentials(self, credentials_data) -> None:
        """Recebe um dicionário ou string, serializa para JSON e encripta."""
        if isinstance(credentials_data, (dict, list)):
            plain_str = json.dumps(credentials_data)
        else:
            plain_str = str(credentials_data)
        self.encrypted_credentials = encrypt_text(plain_str)

    def get_credentials(self):
        """Decripta os dados e retorna como objeto Python (dict/str)."""
        if not self.encrypted_credentials:
            return None
        try:
            decrypted_str = decrypt_text(self.encrypted_credentials)
        except (InvalidToken, ValueError) as exc:
            raise CloudCredentialDecryptionError(
                'Não foi possível desencriptar as credenciais desta integração. '
                'Verifique a chave FERNET_ENCRYPTION_KEY ou reenvie as credenciais.'
            ) from exc

        try:
            return json.loads(decrypted_str)
        except json.JSONDecodeError:
            return decrypted_str

    @property
    def has_valid_credentials(self) -> bool:
        try:
            return bool(self.get_credentials())
        except CloudCredentialDecryptionError:
            return False