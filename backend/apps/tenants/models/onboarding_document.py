from pathlib import Path

from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from .school import School


def onboarding_document_upload_path(instance: 'OnboardingDocument', filename: str) -> str:
    ext = Path(filename).suffix.lower() or '.pdf'
    return f'tenants/{instance.school_id}/onboarding/{instance.doc_type.lower()}_{instance.id}{ext}'


# Preserve migration deconstruct path (`apps.tenants.models.onboarding_document_upload_path`).
onboarding_document_upload_path.__module__ = 'apps.tenants.models'


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
