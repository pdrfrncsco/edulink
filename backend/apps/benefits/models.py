import hashlib
import hmac
import secrets
from django.db import models

from apps.core.models import TimeStampedModel, UUIDModel
from apps.directory.models import AcademicUser
from apps.tenants.models import School


def default_eligible_roles() -> list:
    return ['STUDENT', 'TEACHER']


class BenefitPartner(UUIDModel, TimeStampedModel):
    """
    Parceiro comercial em Angola (operadoras, livrarias, bancos, software)
    que oferece descontos ou pacotes educativos para titulares do Passaporte YetuEdu.
    """
    class Category(models.TextChoices):
        TELECOM = 'TELECOM', 'Telecomunicações & Dados Móveis'
        BOOKSTORE = 'BOOKSTORE', 'Livrarias & Papelarias'
        SOFTWARE = 'SOFTWARE', 'Software & Formação'
        BANKING = 'BANKING', 'Banca & Contas Jovem/Docente'
        TRANSPORT_CULTURE = 'TRANSPORT_CULTURE', 'Transportes & Cultura'

    name = models.CharField(max_length=255, unique=True, verbose_name='Nome do Parceiro')
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.TELECOM,
        verbose_name='Categoria',
    )
    description = models.TextField(blank=True, verbose_name='Descrição da Parceria')
    discount_label = models.CharField(max_length=120, verbose_name='Destaque de Desconto / Vantagem')
    eligible_roles = models.JSONField(
        default=default_eligible_roles,
        verbose_name='Perfis Elegíveis (STUDENT / TEACHER)',
    )
    partner_api_key_hash = models.CharField(
        max_length=128,
        blank=True,
        verbose_name='Hash SHA-256 da API Key do Parceiro',
    )
    website_url = models.URLField(blank=True, verbose_name='Site do Parceiro')
    is_active = models.BooleanField(default=True, verbose_name='Parceiro Ativo')

    class Meta:
        verbose_name = 'Parceiro do Clube de Benefícios'
        verbose_name_plural = 'Parceiros do Clube de Benefícios'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.discount_label})"

    def generate_api_key(self) -> str:
        raw_key = f"yetu_partner_{secrets.token_urlsafe(24)}"
        self.partner_api_key_hash = hashlib.sha256(raw_key.encode('utf-8')).hexdigest()
        return raw_key

    def verify_api_key(self, raw_key: str) -> bool:
        if not self.partner_api_key_hash or not raw_key:
            return False
        candidate_hash = hashlib.sha256(raw_key.strip().encode('utf-8')).hexdigest()
        return hmac.compare_digest(self.partner_api_key_hash, candidate_hash)


class BenefitOffer(UUIDModel, TimeStampedModel):
    """Oferta específica ou pacote educativo em Kwanzas associado a um parceiro."""
    partner = models.ForeignKey(
        BenefitPartner,
        on_delete=models.CASCADE,
        related_name='offers',
        verbose_name='Parceiro',
    )
    title = models.CharField(max_length=255, verbose_name='Título da Oferta')
    promo_code = models.CharField(max_length=60, blank=True, verbose_name='Código Promocional Base')
    price_aoa = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name='Preço em Kwanzas (0 = Gratuito com QR)',
    )
    requires_active_enrollment = models.BooleanField(default=True, verbose_name='Exige Matrícula Ativa')
    is_active = models.BooleanField(default=True, verbose_name='Ativa')

    class Meta:
        verbose_name = 'Oferta de Benefício'
        verbose_name_plural = 'Ofertas de Benefícios'
        ordering = ['partner__name', 'title']

    def __str__(self):
        return f"{self.partner.name}: {self.title}"


class BenefitRedemption(UUIDModel, TimeStampedModel):
    """Registo auditável de resgate/validação de benefício por um aluno ou professor."""
    class VerificationMethod(models.TextChoices):
        QR_JWT = 'QR_JWT', 'Leitura QR Code / JWT'
        PARTNER_API = 'PARTNER_API', 'API POS Parceiro'
        PORTAL_ONLINE = 'PORTAL_ONLINE', 'Resgate Online no Portal PWA'

    class Status(models.TextChoices):
        VALIDATED = 'VALIDATED', 'Voucher Emitido / Validado'
        USED = 'USED', 'Utilizado no Parceiro'
        CANCELLED = 'CANCELLED', 'Cancelado'

    offer = models.ForeignKey(
        BenefitOffer,
        on_delete=models.CASCADE,
        related_name='redemptions',
        verbose_name='Oferta',
    )
    partner = models.ForeignKey(
        BenefitPartner,
        on_delete=models.CASCADE,
        related_name='redemptions',
        verbose_name='Parceiro',
    )
    user = models.ForeignKey(
        AcademicUser,
        on_delete=models.CASCADE,
        related_name='benefit_redemptions',
        verbose_name='Titular Académico',
    )
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='benefit_redemptions',
        verbose_name='Escola (Tenant)',
    )
    verification_method = models.CharField(
        max_length=20,
        choices=VerificationMethod.choices,
        default=VerificationMethod.PORTAL_ONLINE,
        verbose_name='Método de Validação',
    )
    voucher_code = models.CharField(max_length=40, unique=True, verbose_name='Código do Voucher')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.VALIDATED,
        verbose_name='Estado',
    )
    redeemed_at = models.DateTimeField(auto_now_add=True, verbose_name='Resgatado em')

    class Meta:
        verbose_name = 'Resgate de Benefício'
        verbose_name_plural = 'Resgates de Benefícios'
        ordering = ['-redeemed_at']

    def __str__(self):
        return f"{self.voucher_code} - {self.user.institutional_email}"
