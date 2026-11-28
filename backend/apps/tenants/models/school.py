import re

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify

from apps.core.models import TimeStampedModel, UUIDModel
from .validators import (
    RESERVED_PREVIEW_SLUGS,
    domain_validator,
    hex_color_validator,
    nif_validator,
)


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

    apd_notified = models.BooleanField(
        default=False,
        verbose_name='Notificação APD Submetida'
    )
    apd_dossier_number = models.CharField(
        max_length=60,
        blank=True,
        verbose_name='N.º do Dossiê APD'
    )

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
    def resolve_by_host(cls, raw_host: str, root_domain: str | None = None, allow_bare_slug: bool = False):
        """
        Resolve uma escola ativa a partir do cabeçalho Host (usado pelo Caddy On-Demand TLS
        e pelo gerador multi-domínio do Next.js). Suporta domínio próprio, {slug}.edulink.ao,
        {slug}.localhost e (quando allow_bare_slug=True) o preview_slug direto em rotas locais /sites/{slug}.
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

        if allow_bare_slug and '.' not in host and host not in RESERVED_PREVIEW_SLUGS:
            return cls.objects.filter(preview_slug=host, is_active=True).first()
        return None
