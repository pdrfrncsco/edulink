import uuid
from django.db import models


class TimeStampedModel(models.Model):
    """Modelo base abstrato que adiciona timestamps automáticos de auditoria."""
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        abstract = True


class UUIDModel(models.Model):
    """Modelo base abstrato que utiliza UUIDv4 como chave primária."""
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name="Identificador Único"
    )

    class Meta:
        abstract = True
