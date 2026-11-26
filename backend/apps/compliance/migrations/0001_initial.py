import uuid
import django.db.models.deletion
from django.db import migrations, models
import apps.compliance.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('tenants', '0001_initial'),
        ('directory', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='APDDossier',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('director_full_name', models.CharField(max_length=255, verbose_name='Nome do Diretor / Responsável pelo Tratamento')),
                ('director_bi', models.CharField(max_length=40, verbose_name='BI do Diretor')),
                ('dpo_name', models.CharField(blank=True, max_length=255, verbose_name='Ponto Focal / Encarregado de Protecção de Dados')),
                ('dpo_email', models.EmailField(blank=True, max_length=254, verbose_name='E-mail de Privacidade / APD')),
                ('institution_type', models.CharField(choices=[('PRIMARY_SECONDARY', 'Ensino Primário e Secundário (Menores)'), ('HIGHER_ED', 'Ensino Superior / Técnico (IES)')], default='PRIMARY_SECONDARY', max_length=30, verbose_name='Nível de Ensino')),
                ('has_minors', models.BooleanField(default=True, verbose_name='Trata Dados de Menores de Idade')),
                ('international_transfer_providers', models.JSONField(blank=True, default=list, verbose_name='Provedores com Transferência Internacional')),
                ('data_categories', models.JSONField(blank=True, default=list, verbose_name='Categorias de Dados Tratados')),
                ('retention_years', models.PositiveIntegerField(default=5, verbose_name='Prazo de Conservação (Anos após término da matrícula)')),
                ('submission_type', models.CharField(choices=[('NOTIFICATION', 'Notificação Simples (Art.º 25.º)'), ('PRIOR_AUTHORIZATION', 'Autorização Prévia (Art.º 33.º/34.º - Transferência Internacional / Menores)')], default='PRIOR_AUTHORIZATION', max_length=30, verbose_name='Regime Legal perante a APD')),
                ('status', models.CharField(choices=[('DRAFT', 'Rascunho'), ('READY_FOR_SUBMISSION', 'Pronto para Submissão à APD'), ('SUBMITTED', 'Submetido à APD'), ('APPROVED', 'Autorizado / Registado na APD')], default='DRAFT', max_length=30, verbose_name='Estado do Dossiê')),
                ('apd_reference_number', models.CharField(blank=True, max_length=80, verbose_name='N.º de Processo / Registo APD')),
                ('submitted_at', models.DateTimeField(blank=True, null=True, verbose_name='Data de Submissão à APD')),
                ('generated_payload', models.JSONField(blank=True, default=dict, verbose_name='Snapshot Estruturado do Dossiê')),
                ('school', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='apd_dossier', to='tenants.school', verbose_name='Escola (Tenant)')),
            ],
            options={
                'verbose_name': 'Dossiê APD (Lei n.º 22/11)',
                'verbose_name_plural': 'Dossiês APD (Lei n.º 22/11)',
                'ordering': ['school__name'],
            },
        ),
        migrations.CreateModel(
            name='ParentalConsent',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('guardian_full_name', models.CharField(blank=True, max_length=255, verbose_name='Nome do Encarregado de Educação')),
                ('guardian_bi', models.CharField(blank=True, max_length=40, verbose_name='BI do Encarregado')),
                ('guardian_relationship', models.CharField(choices=[('PAI_MAE', 'Pai / Mãe'), ('TUTOR_LEGAL', 'Tutor Legal'), ('ENCARREGADO', 'Encarregado de Educação')], default='ENCARREGADO', max_length=20, verbose_name='Grau de Parentesco / Tutela')),
                ('guardian_phone', models.CharField(blank=True, max_length=30, verbose_name='Telefone do Encarregado')),
                ('guardian_email', models.EmailField(blank=True, max_length=254, verbose_name='E-mail do Encarregado')),
                ('is_minor', models.BooleanField(default=True, verbose_name='Estudante Menor de Idade')),
                ('consent_scope', models.JSONField(default=apps.compliance.models.default_consent_scope, verbose_name='Âmbito do Consentimento')),
                ('status', models.CharField(choices=[('PENDING', 'Aguardando Assinatura'), ('SIGNED', 'Assinado / Consentido'), ('REVOKED', 'Consentimento Revogado')], default='PENDING', max_length=20, verbose_name='Estado do Termo')),
                ('consent_token', models.CharField(default=apps.compliance.models.generate_consent_token, max_length=128, unique=True, verbose_name='Token de Assinatura Digital')),
                ('signed_at', models.DateTimeField(blank=True, null=True, verbose_name='Assinado em')),
                ('revoked_at', models.DateTimeField(blank=True, null=True, verbose_name='Revogado em')),
                ('signed_ip', models.GenericIPAddressField(blank=True, null=True, verbose_name='IP da Assinatura')),
                ('signed_user_agent', models.CharField(blank=True, max_length=255, verbose_name='User-Agent da Assinatura')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='parental_consents', to='tenants.school', verbose_name='Escola (Tenant)')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='parental_consents', to='directory.academicuser', verbose_name='Estudante')),
            ],
            options={
                'verbose_name': 'Termo de Consentimento Parental',
                'verbose_name_plural': 'Termos de Consentimento Parental',
            },
        ),
        migrations.AddIndex(
            model_name='parentalconsent',
            index=models.Index(fields=['school', 'status'], name='compliance__school__8c8a21_idx'),
        ),
        migrations.AddIndex(
            model_name='parentalconsent',
            index=models.Index(fields=['consent_token'], name='compliance__consent_52aa19_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='parentalconsent',
            unique_together={('school', 'student')},
        ),
    ]
