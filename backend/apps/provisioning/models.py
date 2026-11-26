from django.db import models
from apps.core.models import UUIDModel, TimeStampedModel
from apps.tenants.models import School, CloudIntegration
from apps.directory.models import AcademicUser


class ProvisioningLog(UUIDModel, TimeStampedModel):
    """
    Registo auditável de operações de provisionamento, suspensão e testes
    de ligação com o Google Workspace e Microsoft 365.
    """
    class Action(models.TextChoices):
        PROVISION = 'PROVISION', 'Provisionamento / Criação'
        REACTIVATE = 'REACTIVATE', 'Reativação'
        SUSPEND = 'SUSPEND', 'Suspensão / Revogação'
        TEST = 'TEST', 'Teste de Ligação'

    class Status(models.TextChoices):
        SUCCESS = 'SUCCESS', 'Sucesso'
        SANDBOX = 'SANDBOX', 'Simulado (Sandbox)'
        FAILED = 'FAILED', 'Falhou'

    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='provisioning_logs',
        verbose_name='Escola'
    )
    user = models.ForeignKey(
        AcademicUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='provisioning_logs',
        verbose_name='Utilizador Académico'
    )
    provider = models.CharField(
        max_length=20,
        choices=CloudIntegration.Provider.choices,
        verbose_name='Provedor'
    )
    action = models.CharField(
        max_length=20,
        choices=Action.choices,
        verbose_name='Ação'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        verbose_name='Estado'
    )
    external_id = models.CharField(
        max_length=120,
        blank=True,
        verbose_name='ID Externo'
    )
    detail = models.TextField(
        blank=True,
        verbose_name='Detalhes / Mensagem'
    )

    class Meta:
        verbose_name = 'Log de Provisionamento'
        verbose_name_plural = 'Logs de Provisionamento'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['school', 'provider', 'created_at']),
        ]

    def __str__(self):
        target = self.user.institutional_email if self.user else self.school.domain
        return f"[{self.provider}] {self.action} - {target} ({self.status})"
