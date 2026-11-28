import json

from cryptography.fernet import InvalidToken
from django.db import models

from apps.core.crypto import decrypt_text, encrypt_text
from apps.core.models import TimeStampedModel, UUIDModel
from .school import School


class CloudCredentialDecryptionError(Exception):
    """Lançada quando uma credencial encriptada não pode ser lida (ex.: rotação de chave Fernet)."""


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
