import secrets
from django.db import models
from apps.core.models import TimeStampedModel, UUIDModel
from apps.directory.models import AcademicUser
from apps.tenants.models import School


def default_consent_scope() -> dict:
    return {
        'institutional_email': True,
        'cloud_classroom': True,
        'digital_passport_qr': True,
        'international_transfer': True,
    }


def generate_consent_token() -> str:
    return secrets.token_urlsafe(32)


class APDDossier(UUIDModel, TimeStampedModel):
    """
    Dossiê de Notificação ou Autorização Prévia perante a Agência de Protecção
    de Dados (APD - Angola) ao abrigo da Lei n.º 22/11 de 17 de Junho.
    """
    class InstitutionType(models.TextChoices):
        PRIMARY_SECONDARY = 'PRIMARY_SECONDARY', 'Ensino Primário e Secundário (Menores)'
        HIGHER_ED = 'HIGHER_ED', 'Ensino Superior / Técnico (IES)'

    class SubmissionType(models.TextChoices):
        NOTIFICATION = 'NOTIFICATION', 'Notificação Simples (Art.º 25.º)'
        PRIOR_AUTHORIZATION = 'PRIOR_AUTHORIZATION', 'Autorização Prévia (Art.º 33.º/34.º - Transferência Internacional / Menores)'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Rascunho'
        READY_FOR_SUBMISSION = 'READY_FOR_SUBMISSION', 'Pronto para Submissão à APD'
        SUBMITTED = 'SUBMITTED', 'Submetido à APD'
        APPROVED = 'APPROVED', 'Autorizado / Registado na APD'

    school = models.OneToOneField(
        School,
        on_delete=models.CASCADE,
        related_name='apd_dossier',
        verbose_name='Escola (Tenant)',
    )
    director_full_name = models.CharField(
        max_length=255,
        verbose_name='Nome do Diretor / Responsável pelo Tratamento',
    )
    director_bi = models.CharField(
        max_length=40,
        verbose_name='BI do Diretor',
    )
    dpo_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Ponto Focal / Encarregado de Protecção de Dados',
    )
    dpo_email = models.EmailField(
        blank=True,
        verbose_name='E-mail de Privacidade / APD',
    )
    institution_type = models.CharField(
        max_length=30,
        choices=InstitutionType.choices,
        default=InstitutionType.PRIMARY_SECONDARY,
        verbose_name='Nível de Ensino',
    )
    has_minors = models.BooleanField(
        default=True,
        verbose_name='Trata Dados de Menores de Idade',
    )
    international_transfer_providers = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Provedores com Transferência Internacional',
    )
    data_categories = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Categorias de Dados Tratados',
    )
    retention_years = models.PositiveIntegerField(
        default=5,
        verbose_name='Prazo de Conservação (Anos após término da matrícula)',
    )
    submission_type = models.CharField(
        max_length=30,
        choices=SubmissionType.choices,
        default=SubmissionType.PRIOR_AUTHORIZATION,
        verbose_name='Regime Legal perante a APD',
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name='Estado do Dossiê',
    )
    apd_reference_number = models.CharField(
        max_length=80,
        blank=True,
        verbose_name='N.º de Processo / Registo APD',
    )
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Data de Submissão à APD',
    )
    generated_payload = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Snapshot Estruturado do Dossiê',
    )

    class Meta:
        verbose_name = 'Dossiê APD (Lei n.º 22/11)'
        verbose_name_plural = 'Dossiês APD (Lei n.º 22/11)'
        ordering = ['school__name']

    def __str__(self):
        return f"Dossiê APD - {self.school.name} [{self.get_status_display()}]"


class ParentalConsent(UUIDModel, TimeStampedModel):
    """
    Termo de Consentimento Informado do Encarregado de Educação para tratamento
    de dados de estudantes (especialmente menores) e emissão de contas .edu.ao.
    """
    class Relationship(models.TextChoices):
        PAI_MAE = 'PAI_MAE', 'Pai / Mãe'
        TUTOR_LEGAL = 'TUTOR_LEGAL', 'Tutor Legal'
        ENCARREGADO = 'ENCARREGADO', 'Encarregado de Educação'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Aguardando Assinatura'
        SIGNED = 'SIGNED', 'Assinado / Consentido'
        REVOKED = 'REVOKED', 'Consentimento Revogado'

    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='parental_consents',
        verbose_name='Escola (Tenant)',
    )
    student = models.ForeignKey(
        AcademicUser,
        on_delete=models.CASCADE,
        related_name='parental_consents',
        verbose_name='Estudante',
    )
    guardian_full_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Nome do Encarregado de Educação',
    )
    guardian_bi = models.CharField(
        max_length=40,
        blank=True,
        verbose_name='BI do Encarregado',
    )
    guardian_relationship = models.CharField(
        max_length=20,
        choices=Relationship.choices,
        default=Relationship.ENCARREGADO,
        verbose_name='Grau de Parentesco / Tutela',
    )
    guardian_phone = models.CharField(
        max_length=30,
        blank=True,
        verbose_name='Telefone do Encarregado',
    )
    guardian_email = models.EmailField(
        blank=True,
        verbose_name='E-mail do Encarregado',
    )
    is_minor = models.BooleanField(
        default=True,
        verbose_name='Estudante Menor de Idade',
    )
    consent_scope = models.JSONField(
        default=default_consent_scope,
        verbose_name='Âmbito do Consentimento',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='Estado do Termo',
    )
    consent_token = models.CharField(
        max_length=128,
        unique=True,
        default=generate_consent_token,
        verbose_name='Token de Assinatura Digital',
    )
    signed_at = models.DateTimeField(null=True, blank=True, verbose_name='Assinado em')
    revoked_at = models.DateTimeField(null=True, blank=True, verbose_name='Revogado em')
    signed_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP da Assinatura')
    signed_user_agent = models.CharField(max_length=255, blank=True, verbose_name='User-Agent da Assinatura')

    class Meta:
        verbose_name = 'Termo de Consentimento Parental'
        verbose_name_plural = 'Termos de Consentimento Parental'
        unique_together = ('school', 'student')
        indexes = [
            models.Index(fields=['school', 'status']),
            models.Index(fields=['consent_token']),
        ]

    def __str__(self):
        return f"Consentimento - {self.student.full_name} ({self.get_status_display()})"
