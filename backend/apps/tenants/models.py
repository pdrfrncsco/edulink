import json
from django.db import models
from django.core.validators import RegexValidator
from apps.core.models import UUIDModel, TimeStampedModel
from apps.core.crypto import encrypt_text, decrypt_text

nif_validator = RegexValidator(
    regex=r'^\d{9,10}[A-Za-z0-9]?$',
    message='O NIF de Angola deve conter entre 9 a 10 dígitos numéricos (com possível sufixo).'
)

domain_validator = RegexValidator(
    regex=r'^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.(edu\.ao|localhost)$',
    message='O domínio deve ser um domínio válido terminado em .edu.ao ou .localhost para testes locais.'
)


class School(UUIDModel, TimeStampedModel):
    """
    Entidade Central (Tenant) que isola os dados de cada instituição escolar.
    Gera automaticamente o site institucional e apoia a submissão regulatória da APD.
    """
    name = models.CharField(max_length=255, verbose_name="Nome da Instituição")
    nif = models.CharField(
        max_length=20,
        unique=True,
        validators=[nif_validator],
        verbose_name="NIF Institucional"
    )
    alvara_med_mescti = models.CharField(
        max_length=100,
        verbose_name="Alvará MED / MESCTI",
        help_text="Número do Alvará ou Decreto de Reconhecimento Oficial"
    )
    domain = models.CharField(
        max_length=120,
        unique=True,
        validators=[domain_validator],
        verbose_name="Domínio Institucional (.edu.ao)",
        help_text="Exemplo: colegio-esperanca.edu.ao"
    )
    primary_color = models.CharField(
        max_length=7,
        default="#0D9488",
        verbose_name="Cor Primária (Hex)",
        help_text="Cor base para o site e cartão digital do aluno"
    )
    logo_url = models.URLField(
        blank=True,
        null=True,
        verbose_name="URL do Logotipo"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Ativo",
        help_text="Indica se a escola tem subscrição ativa na EduLink"
    )

    # Dados de Contato e Localização (Angola)
    contact_email = models.EmailField(verbose_name="E-mail Institucional de Contato")
    phone = models.CharField(max_length=30, blank=True, verbose_name="Telefone da Secretaria")
    province = models.CharField(max_length=60, default="Luanda", verbose_name="Província")
    municipality = models.CharField(max_length=60, default="Talatona", verbose_name="Município")
    address = models.CharField(max_length=255, blank=True, verbose_name="Endereço Físico")
    about_text = models.TextField(
        blank=True,
        verbose_name="Texto Sobre a Instituição",
        help_text="Apresentação institucional exibida no site .edu.ao"
    )

    # Blindagem Regulatória APD (Lei n.º 22/11)
    apd_notified = models.BooleanField(
        default=False,
        verbose_name="Notificação APD Submetida"
    )
    apd_dossier_number = models.CharField(
        max_length=60,
        blank=True,
        verbose_name="N.º do Dossiê APD"
    )

    class Meta:
        verbose_name = "Escola (Tenant)"
        verbose_name_plural = "Escolas (Tenants)"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.domain})"


class CloudIntegration(UUIDModel, TimeStampedModel):
    """
    Armazena com segurança (AES-256 / Fernet) as credenciais de autenticação
    de cada escola nos provedores de nuvem (Google Workspace for Education e Microsoft 365).
    """
    class Provider(models.TextChoices):
        GOOGLE = "GOOGLE", "Google Workspace for Education"
        MICROSOFT = "MICROSOFT", "Microsoft 365 Education (A1/Entra ID)"

    class SyncStatus(models.TextChoices):
        IDLE = "IDLE", "Aguardando"
        SYNCING = "SYNCING", "Sincronizando"
        SUCCESS = "SUCCESS", "Sincronizado com Sucesso"
        ERROR = "ERROR", "Erro de Sincronização"

    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name="cloud_integrations",
        verbose_name="Escola"
    )
    provider = models.CharField(
        max_length=20,
        choices=Provider.choices,
        verbose_name="Provedor de Nuvem"
    )
    encrypted_credentials = models.TextField(
        verbose_name="Credenciais Encriptadas (AES-256)",
        help_text="JSON da Service Account ou Chave Secreta encriptada com Fernet"
    )
    sync_enabled = models.BooleanField(
        default=True,
        verbose_name="Sincronização Automática Ativa"
    )
    sync_status = models.CharField(
        max_length=20,
        choices=SyncStatus.choices,
        default=SyncStatus.IDLE,
        verbose_name="Estado de Sincronização"
    )
    last_sync_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Última Sincronização"
    )
    last_error_message = models.TextField(
        blank=True,
        verbose_name="Última Mensagem de Erro"
    )

    class Meta:
        verbose_name = "Integração de Nuvem"
        verbose_name_plural = "Integrações de Nuvem"
        unique_together = ('school', 'provider')

    def __str__(self):
        return f"{self.school.name} - {self.get_provider_display()}"

    def set_credentials(self, credentials_data):
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
        decrypted_str = decrypt_text(self.encrypted_credentials)
        try:
            return json.loads(decrypted_str)
        except json.JSONDecodeError:
            return decrypted_str
