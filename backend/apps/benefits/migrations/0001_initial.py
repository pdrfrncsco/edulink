import uuid
import django.db.models.deletion
from django.db import migrations, models
import apps.benefits.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('tenants', '0001_initial'),
        ('directory', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='BenefitPartner',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('name', models.CharField(max_length=255, unique=True, verbose_name='Nome do Parceiro')),
                ('category', models.CharField(choices=[('TELECOM', 'Telecomunicações & Dados Móveis'), ('BOOKSTORE', 'Livrarias & Papelarias'), ('SOFTWARE', 'Software & Formação'), ('BANKING', 'Banca & Contas Jovem/Docente'), ('TRANSPORT_CULTURE', 'Transportes & Cultura')], default='TELECOM', max_length=30, verbose_name='Categoria')),
                ('description', models.TextField(blank=True, verbose_name='Descrição da Parceria')),
                ('discount_label', models.CharField(max_length=120, verbose_name='Destaque de Desconto / Vantagem')),
                ('eligible_roles', models.JSONField(default=apps.benefits.models.default_eligible_roles, verbose_name='Perfis Elegíveis (STUDENT / TEACHER)')),
                ('partner_api_key_hash', models.CharField(blank=True, max_length=128, verbose_name='Hash SHA-256 da API Key do Parceiro')),
                ('website_url', models.URLField(blank=True, verbose_name='Site do Parceiro')),
                ('is_active', models.BooleanField(default=True, verbose_name='Parceiro Ativo')),
            ],
            options={
                'verbose_name': 'Parceiro do Clube de Benefícios',
                'verbose_name_plural': 'Parceiros do Clube de Benefícios',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='BenefitOffer',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('title', models.CharField(max_length=255, verbose_name='Título da Oferta')),
                ('promo_code', models.CharField(blank=True, max_length=60, verbose_name='Código Promocional Base')),
                ('price_aoa', models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name='Preço em Kwanzas (0 = Gratuito com QR)')),
                ('requires_active_enrollment', models.BooleanField(default=True, verbose_name='Exige Matrícula Ativa')),
                ('is_active', models.BooleanField(default=True, verbose_name='Ativa')),
                ('partner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='offers', to='benefits.benefitpartner', verbose_name='Parceiro')),
            ],
            options={
                'verbose_name': 'Oferta de Benefício',
                'verbose_name_plural': 'Ofertas de Benefícios',
                'ordering': ['partner__name', 'title'],
            },
        ),
        migrations.CreateModel(
            name='BenefitRedemption',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('verification_method', models.CharField(choices=[('QR_JWT', 'Leitura QR Code / JWT'), ('PARTNER_API', 'API POS Parceiro'), ('PORTAL_ONLINE', 'Resgate Online no Portal PWA')], default='PORTAL_ONLINE', max_length=20, verbose_name='Método de Validação')),
                ('voucher_code', models.CharField(max_length=40, unique=True, verbose_name='Código do Voucher')),
                ('status', models.CharField(choices=[('VALIDATED', 'Voucher Emitido / Validado'), ('USED', 'Utilizado no Parceiro'), ('CANCELLED', 'Cancelado')], default='VALIDATED', max_length=20, verbose_name='Estado')),
                ('redeemed_at', models.DateTimeField(auto_now_add=True, verbose_name='Resgatado em')),
                ('offer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='redemptions', to='benefits.benefitoffer', verbose_name='Oferta')),
                ('partner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='redemptions', to='benefits.benefitpartner', verbose_name='Parceiro')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='benefit_redemptions', to='tenants.school', verbose_name='Escola (Tenant)')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='benefit_redemptions', to='directory.academicuser', verbose_name='Titular Académico')),
            ],
            options={
                'verbose_name': 'Resgate de Benefício',
                'verbose_name_plural': 'Resgates de Benefícios',
                'ordering': ['-redeemed_at'],
            },
        ),
    ]
