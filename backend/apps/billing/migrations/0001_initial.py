from decimal import Decimal
import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('benefits', '0001_initial'),
        ('directory', '0001_initial'),
        ('tenants', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SchoolSubscription',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('plan_code', models.CharField(choices=[('SETUP_DIGITAL', 'Setup Escola Digital (150.000 Kz)'), ('ESSENCIAL', 'YetuEdu Essencial (240.000 Kz/ano)'), ('PRO', 'YetuEdu Pro (480.000 Kz/ano)'), ('CAMPUS', 'YetuEdu Campus (1.200.000 Kz/ano)')], default='ESSENCIAL', max_length=30, verbose_name='Plano Comercial')),
                ('annual_price_aoa', models.DecimalField(decimal_places=2, default=Decimal('240000.00'), max_digits=12, verbose_name='Valor (AOA)')),
                ('status', models.CharField(choices=[('TRIAL', 'Período Experimental'), ('PENDING_PAYMENT', 'Aguardando Pagamento'), ('ACTIVE', 'Ativa'), ('SUSPENDED', 'Suspensa'), ('CANCELLED', 'Cancelada')], default='PENDING_PAYMENT', max_length=25, verbose_name='Estado')),
                ('starts_at', models.DateTimeField(blank=True, null=True, verbose_name='Início de Vigência')),
                ('expires_at', models.DateTimeField(blank=True, null=True, verbose_name='Fim de Vigência')),
                ('auto_renew', models.BooleanField(default=True, verbose_name='Renovação Automática')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subscriptions', to='tenants.school', verbose_name='Escola / Instituição')),
            ],
            options={
                'verbose_name': 'Subscrição de Escola',
                'verbose_name_plural': 'Subscrições de Escolas',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='KwanzaPayment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('reference', models.CharField(max_length=40, unique=True, verbose_name='Referência de Pagamento')),
                ('payment_method', models.CharField(choices=[('MULTICAIXA_EXPRESS', 'Multicaixa Express'), ('KWIK', 'KWiK (Transferência Instantânea)'), ('BANK_TRANSFER', 'Transferência Bancária (IBAN)')], default='MULTICAIXA_EXPRESS', max_length=30, verbose_name='Método de Pagamento')),
                ('amount_aoa', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Montante (AOA)')),
                ('currency', models.CharField(default='AOA', max_length=10, verbose_name='Moeda')),
                ('status', models.CharField(choices=[('PENDING', 'Pendente'), ('CONFIRMED', 'Confirmado'), ('FAILED', 'Falhado'), ('EXPIRED', 'Expirado')], default='PENDING', max_length=20, verbose_name='Estado')),
                ('customer_phone', models.CharField(blank=True, max_length=30, verbose_name='Telefone (MCX / KWiK)')),
                ('customer_name', models.CharField(blank=True, max_length=255, verbose_name='Nome do Cliente')),
                ('customer_nif', models.CharField(blank=True, max_length=30, verbose_name='NIF do Cliente')),
                ('description', models.CharField(max_length=255, verbose_name='Descrição')),
                ('gateway_transaction_id', models.CharField(blank=True, max_length=120, verbose_name='ID Transação Gateway')),
                ('webhook_payload', models.JSONField(blank=True, default=dict, verbose_name='Payload Webhook')),
                ('confirmed_at', models.DateTimeField(blank=True, null=True, verbose_name='Data de Confirmação')),
                ('academic_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payments', to='directory.academicuser', verbose_name='Titular Académico')),
                ('benefit_offer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payments', to='benefits.benefitoffer', verbose_name='Oferta de Benefício')),
                ('school', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='tenants.school', verbose_name='Escola')),
                ('subscription', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payments', to='billing.schoolsubscription', verbose_name='Subscrição')),
            ],
            options={
                'verbose_name': 'Pagamento em Kwanzas',
                'verbose_name_plural': 'Pagamentos em Kwanzas',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AGTInvoice',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('series', models.CharField(default='FT YE2026', max_length=20, verbose_name='Série')),
                ('sequence_number', models.PositiveIntegerField(verbose_name='Número Sequencial')),
                ('invoice_number', models.CharField(max_length=40, unique=True, verbose_name='Número da Fatura')),
                ('issue_date', models.DateTimeField(verbose_name='Data de Emissão')),
                ('issuer_name', models.CharField(default='YetuEdu Tecnologia Educacional, Lda.', max_length=255, verbose_name='Emitente')),
                ('issuer_nif', models.CharField(default='5417098123', max_length=30, verbose_name='NIF Emitente')),
                ('customer_name', models.CharField(max_length=255, verbose_name='Nome do Adquirente')),
                ('customer_nif', models.CharField(default='999999999', max_length=30, verbose_name='NIF Adquirente')),
                ('subtotal_aoa', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Base Tributável (AOA)')),
                ('iva_rate', models.DecimalField(decimal_places=2, default=Decimal('14.00'), max_digits=5, verbose_name='Taxa IVA (%)')),
                ('iva_amount_aoa', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Valor IVA (AOA)')),
                ('total_aoa', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Total Fatura (AOA)')),
                ('previous_hash', models.CharField(blank=True, max_length=128, verbose_name='Hash Anterior (Cadeia)')),
                ('agt_hash', models.CharField(max_length=128, verbose_name='Hash Criptográfico SHA-256')),
                ('hash_control', models.CharField(max_length=8, verbose_name='4 Caracteres de Controlo AGT')),
                ('software_certificate_no', models.CharField(default='AGT-CERT-YETUEDU-2026', max_length=40, verbose_name='Certificação Software')),
                ('qr_payload', models.TextField(verbose_name='Conteúdo QR Code AGT')),
                ('saft_payload', models.JSONField(default=dict, verbose_name='Estrutura SAF-T (AO)')),
                ('payment', models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name='agt_invoice', to='billing.kwanzapayment', verbose_name='Pagamento Associado')),
                ('school', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='agt_invoices', to='tenants.school', verbose_name='Escola')),
            ],
            options={
                'verbose_name': 'Fatura Eletrónica AGT',
                'verbose_name_plural': 'Faturas Eletrónicas AGT',
                'ordering': ['-sequence_number'],
            },
        ),
    ]
