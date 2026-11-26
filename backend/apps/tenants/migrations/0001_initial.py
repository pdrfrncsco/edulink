import uuid
import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='School',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('name', models.CharField(max_length=255, verbose_name='Nome da Instituição')),
                ('nif', models.CharField(max_length=20, unique=True, validators=[django.core.validators.RegexValidator(message='O NIF de Angola deve conter entre 9 a 10 dígitos numéricos (com possível sufixo).', regex='^\\d{9,10}[A-Za-z0-9]?$')], verbose_name='NIF Institucional')),
                ('alvara_med_mescti', models.CharField(help_text='Número do Alvará ou Decreto de Reconhecimento Oficial', max_length=100, verbose_name='Alvará MED / MESCTI')),
                ('domain', models.CharField(help_text='Exemplo: colegio-esperanca.edu.ao', max_length=120, unique=True, validators=[django.core.validators.RegexValidator(message='O domínio deve ser um domínio válido terminado em .edu.ao ou .localhost para testes locais.', regex='^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\\.(edu\\.ao|localhost)$')], verbose_name='Domínio Institucional (.edu.ao)')),
                ('primary_color', models.CharField(default='#0D9488', help_text='Cor base para o site e cartão digital do aluno', max_length=7, verbose_name='Cor Primária (Hex)')),
                ('logo_url', models.URLField(blank=True, null=True, verbose_name='URL do Logotipo')),
                ('is_active', models.BooleanField(default=True, help_text='Indica se a escola tem subscrição ativa na EduLink', verbose_name='Ativo')),
                ('contact_email', models.EmailField(max_length=254, verbose_name='E-mail Institucional de Contato')),
                ('phone', models.CharField(blank=True, max_length=30, verbose_name='Telefone da Secretaria')),
                ('province', models.CharField(default='Luanda', max_length=60, verbose_name='Província')),
                ('municipality', models.CharField(default='Talatona', max_length=60, verbose_name='Município')),
                ('address', models.CharField(blank=True, max_length=255, verbose_name='Endereço Físico')),
                ('about_text', models.TextField(blank=True, help_text='Apresentação institucional exibida no site .edu.ao', verbose_name='Texto Sobre a Instituição')),
                ('apd_notified', models.BooleanField(default=False, verbose_name='Notificação APD Submetida')),
                ('apd_dossier_number', models.CharField(blank=True, max_length=60, verbose_name='N.º do Dossiê APD')),
            ],
            options={
                'verbose_name': 'Escola (Tenant)',
                'verbose_name_plural': 'Escolas (Tenants)',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='CloudIntegration',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('provider', models.CharField(choices=[('GOOGLE', 'Google Workspace for Education'), ('MICROSOFT', 'Microsoft 365 Education (A1/Entra ID)')], max_length=20, verbose_name='Provedor de Nuvem')),
                ('encrypted_credentials', models.TextField(help_text='JSON da Service Account ou Chave Secreta encriptada com Fernet', verbose_name='Credenciais Encriptadas (AES-256)')),
                ('sync_enabled', models.BooleanField(default=True, verbose_name='Sincronização Automática Ativa')),
                ('sync_status', models.CharField(choices=[('IDLE', 'Aguardando'), ('SYNCING', 'Sincronizando'), ('SUCCESS', 'Sincronizado com Sucesso'), ('ERROR', 'Erro de Sincronização')], default='IDLE', max_length=20, verbose_name='Estado de Sincronização')),
                ('last_sync_at', models.DateTimeField(blank=True, null=True, verbose_name='Última Sincronização')),
                ('last_error_message', models.TextField(blank=True, verbose_name='Última Mensagem de Erro')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cloud_integrations', to='tenants.school', verbose_name='Escola')),
            ],
            options={
                'verbose_name': 'Integração de Nuvem',
                'verbose_name_plural': 'Integrações de Nuvem',
                'unique_together': {('school', 'provider')},
            },
        ),
    ]
