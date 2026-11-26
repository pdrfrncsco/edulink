from django.db import models
from apps.core.models import TimeStampedModel, UUIDModel
from apps.tenants.models import School


class GlobalVerifierApplication(UUIDModel, TimeStampedModel):
    """
    Acompanha o credenciamento institucional da escola/IES nas plataformas
    globais de benefícios estudantis (SheerID, UNiDAYS e GitHub Education).
    """
    class Verifier(models.TextChoices):
        SHEERID = 'SHEERID', 'SheerID (Spotify, Google AI, Autodesk)'
        UNIDAYS = 'UNIDAYS', 'UNiDAYS (Apple Education, Descontos Globais)'
        GITHUB_EDUCATION = 'GITHUB_EDUCATION', 'GitHub Education Campus (Student Pack)'

    class Status(models.TextChoices):
        NOT_STARTED = 'NOT_STARTED', 'Não Iniciado'
        DOSSIER_READY = 'DOSSIER_READY', 'Pacote de Credenciação Pronto'
        SUBMITTED = 'SUBMITTED', 'Submetido para Auditoria'
        APPROVED = 'APPROVED', 'Aprovado / Elegível'

    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='verifier_applications',
        verbose_name='Escola / IES (Tenant)',
    )
    verifier = models.CharField(
        max_length=30,
        choices=Verifier.choices,
        verbose_name='Verificador Global',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NOT_STARTED,
        verbose_name='Estado',
    )
    official_website_url = models.URLField(
        blank=True,
        verbose_name='URL Oficial do Site (.edu.ao)',
    )
    submission_reference = models.CharField(
        max_length=120,
        blank=True,
        verbose_name='Referência / Ticket de Submissão',
    )
    readiness_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Diagnóstico de Prontidão',
    )
    notes = models.TextField(blank=True, verbose_name='Notas de Auditoria')

    class Meta:
        verbose_name = 'Credenciação em Verificador Global'
        verbose_name_plural = 'Credenciações em Verificadores Globais'
        unique_together = ('school', 'verifier')
        ordering = ['school__name', 'verifier']

    def __str__(self):
        return f"{self.school.domain} - {self.get_verifier_display()} ({self.status})"
