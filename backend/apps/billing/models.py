from decimal import Decimal
from django.db import models

from apps.benefits.models import BenefitOffer
from apps.core.models import TimeStampedModel, UUIDModel
from apps.directory.models import AcademicUser
from apps.tenants.models import School


PLAN_CATALOG = {
    'SETUP_DIGITAL': {
        'label': 'Setup Escola Digital (Arranque Único)',
        'price_aoa': Decimal('150000.00'),
        'duration_days': 365,
        'max_users': 500,
    },
    'ESSENCIAL': {
        'label': 'YetuEdu Essencial (Anual)',
        'price_aoa': Decimal('240000.00'),
        'duration_days': 365,
        'max_users': 500,
    },
    'PRO': {
        'label': 'YetuEdu Pro (Anual)',
        'price_aoa': Decimal('480000.00'),
        'duration_days': 365,
        'max_users': 1500,
    },
    'CAMPUS': {
        'label': 'YetuEdu Campus (Anual Ilimitado)',
        'price_aoa': Decimal('1200000.00'),
        'duration_days': 365,
        'max_users': 0,
    },
}


class SchoolSubscription(UUIDModel, TimeStampedModel):
    """Subscrição comercial YetuEdu de uma escola em Kwanzas (AOA)."""

    class PlanCode(models.TextChoices):
        SETUP_DIGITAL = 'SETUP_DIGITAL', 'Setup Escola Digital (150.000 Kz)'
        ESSENCIAL = 'ESSENCIAL', 'YetuEdu Essencial (240.000 Kz/ano)'
        PRO = 'PRO', 'YetuEdu Pro (480.000 Kz/ano)'
        CAMPUS = 'CAMPUS', 'YetuEdu Campus (1.200.000 Kz/ano)'

    class Status(models.TextChoices):
        TRIAL = 'TRIAL', 'Período Experimental'
        PENDING_PAYMENT = 'PENDING_PAYMENT', 'Aguardando Pagamento'
        ACTIVE = 'ACTIVE', 'Ativa'
        SUSPENDED = 'SUSPENDED', 'Suspensa'
        CANCELLED = 'CANCELLED', 'Cancelada'

    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='subscriptions',
        verbose_name='Escola / Instituição',
    )
    plan_code = models.CharField(
        max_length=30,
        choices=PlanCode.choices,
        default=PlanCode.ESSENCIAL,
        verbose_name='Plano Comercial',
    )
    annual_price_aoa = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('240000.00'),
        verbose_name='Valor (AOA)',
    )
    status = models.CharField(
        max_length=25,
        choices=Status.choices,
        default=Status.PENDING_PAYMENT,
        verbose_name='Estado',
    )
    starts_at = models.DateTimeField(null=True, blank=True, verbose_name='Início de Vigência')
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name='Fim de Vigência')
    auto_renew = models.BooleanField(default=True, verbose_name='Renovação Automática')

    class Meta:
        verbose_name = 'Subscrição de Escola'
        verbose_name_plural = 'Subscrições de Escolas'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.school.name} - {self.plan_code} ({self.status})"

    @classmethod
    def default_price_for(cls, plan_code: str) -> Decimal:
        """Retorna o preço tabelado em AOA para o plano indicado."""
        entry = PLAN_CATALOG.get(plan_code)
        return entry['price_aoa'] if entry else Decimal('240000.00')


class KwanzaPayment(UUIDModel, TimeStampedModel):
    """Transação de pagamento em Kwanzas via Multicaixa Express, KWiK ou transferência."""

    class Method(models.TextChoices):
        MULTICAIXA_EXPRESS = 'MULTICAIXA_EXPRESS', 'Multicaixa Express'
        KWIK = 'KWIK', 'KWiK (Transferência Instantânea)'
        BANK_TRANSFER = 'BANK_TRANSFER', 'Transferência Bancária (IBAN)'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pendente'
        CONFIRMED = 'CONFIRMED', 'Confirmado'
        FAILED = 'FAILED', 'Falhado'
        EXPIRED = 'EXPIRED', 'Expirado'

    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name='Escola',
    )
    subscription = models.ForeignKey(
        SchoolSubscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name='Subscrição',
    )
    academic_user = models.ForeignKey(
        AcademicUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name='Titular Académico',
    )
    benefit_offer = models.ForeignKey(
        BenefitOffer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name='Oferta de Benefício',
    )
    reference = models.CharField(max_length=40, unique=True, verbose_name='Referência de Pagamento')
    payment_method = models.CharField(
        max_length=30,
        choices=Method.choices,
        default=Method.MULTICAIXA_EXPRESS,
        verbose_name='Método de Pagamento',
    )
    amount_aoa = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Montante (AOA)')
    currency = models.CharField(max_length=10, default='AOA', verbose_name='Moeda')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='Estado',
    )
    customer_phone = models.CharField(max_length=30, blank=True, verbose_name='Telefone (MCX / KWiK)')
    customer_name = models.CharField(max_length=255, blank=True, verbose_name='Nome do Cliente')
    customer_nif = models.CharField(max_length=30, blank=True, verbose_name='NIF do Cliente')
    description = models.CharField(max_length=255, verbose_name='Descrição')
    gateway_transaction_id = models.CharField(max_length=120, blank=True, verbose_name='ID Transação Gateway')
    webhook_payload = models.JSONField(default=dict, blank=True, verbose_name='Payload Webhook')
    confirmed_at = models.DateTimeField(null=True, blank=True, verbose_name='Data de Confirmação')

    class Meta:
        verbose_name = 'Pagamento em Kwanzas'
        verbose_name_plural = 'Pagamentos em Kwanzas'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reference} - {self.amount_aoa} AOA ({self.status})"


class AGTInvoice(UUIDModel, TimeStampedModel):
    """Fatura eletrónica compatível com requisitos AGT Angola (hash encadeado, IVA 14%, SAF-T)."""

    school = models.ForeignKey(
        School,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agt_invoices',
        verbose_name='Escola',
    )
    payment = models.OneToOneField(
        KwanzaPayment,
        on_delete=models.PROTECT,
        related_name='agt_invoice',
        verbose_name='Pagamento Associado',
    )
    series = models.CharField(max_length=20, default='FT YE2026', verbose_name='Série')
    sequence_number = models.PositiveIntegerField(verbose_name='Número Sequencial')
    invoice_number = models.CharField(max_length=40, unique=True, verbose_name='Número da Fatura')
    issue_date = models.DateTimeField(verbose_name='Data de Emissão')
    issuer_name = models.CharField(
        max_length=255,
        default='YetuEdu Tecnologia Educacional, Lda.',
        verbose_name='Emitente',
    )
    issuer_nif = models.CharField(max_length=30, default='5417098123', verbose_name='NIF Emitente')
    customer_name = models.CharField(max_length=255, verbose_name='Nome do Adquirente')
    customer_nif = models.CharField(max_length=30, default='999999999', verbose_name='NIF Adquirente')
    subtotal_aoa = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Base Tributável (AOA)')
    iva_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('14.00'), verbose_name='Taxa IVA (%)')
    iva_amount_aoa = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Valor IVA (AOA)')
    total_aoa = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Total Fatura (AOA)')
    previous_hash = models.CharField(max_length=128, blank=True, verbose_name='Hash Anterior (Cadeia)')
    agt_hash = models.CharField(max_length=128, verbose_name='Hash Criptográfico SHA-256')
    hash_control = models.CharField(max_length=8, verbose_name='4 Caracteres de Controlo AGT')
    software_certificate_no = models.CharField(
        max_length=40,
        default='AGT-CERT-YETUEDU-2026',
        verbose_name='Certificação Software',
    )
    qr_payload = models.TextField(verbose_name='Conteúdo QR Code AGT')
    saft_payload = models.JSONField(default=dict, verbose_name='Estrutura SAF-T (AO)')

    class Meta:
        verbose_name = 'Fatura Eletrónica AGT'
        verbose_name_plural = 'Faturas Eletrónicas AGT'
        ordering = ['-sequence_number']

    def __str__(self):
        return f"{self.invoice_number} ({self.total_aoa} AOA)"
