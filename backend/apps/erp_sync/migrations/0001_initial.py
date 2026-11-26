import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('tenants', '0001_initial'),
        ('directory', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ERPConnection',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('provider', models.CharField(choices=[('KLASSE', 'KLASSE ERP'), ('SYSPORTAL', 'SysPortal Académico'), ('KACENNU', 'Kacennu Gestão Escolar'), ('GENERIC', 'Webhook Genérico JSON')], max_length=20, verbose_name='ERP Angolano')),
                ('api_base_url', models.URLField(blank=True, verbose_name='URL Base da API do ERP (opcional)')),
                ('encrypted_api_key', models.TextField(blank=True, verbose_name='API Key Encriptada (Polling)')),
                ('encrypted_webhook_secret', models.TextField(blank=True, verbose_name='Segredo HMAC Webhook (Encriptado)')),
                ('is_active', models.BooleanField(default=True, verbose_name='Conector Ativo')),
                ('last_event_at', models.DateTimeField(blank=True, null=True, verbose_name='Último Evento Recebido')),
                ('last_sync_status', models.CharField(choices=[('IDLE', 'Aguardando Eventos'), ('SUCCESS', 'Sincronizado'), ('ERROR', 'Erro de Sincronização')], default='IDLE', max_length=20, verbose_name='Estado da Sincronização')),
                ('last_error', models.TextField(blank=True, verbose_name='Último Erro')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='erp_connections', to='tenants.school', verbose_name='Escola (Tenant)')),
            ],
            options={
                'verbose_name': 'Ligação ERP Local',
                'verbose_name_plural': 'Ligações ERPs Locais',
                'ordering': ['school__name', 'provider'],
                'unique_together': {('school', 'provider')},
            },
        ),
        migrations.CreateModel(
            name='ERPSyncEvent',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('provider', models.CharField(max_length=20, verbose_name='Provedor ERP')),
                ('event_id', models.CharField(blank=True, max_length=120, verbose_name='ID de Idempotência')),
                ('event_type', models.CharField(choices=[('STUDENT_ENROLLED', 'Matrícula / Renovação'), ('TEACHER_ASSIGNED', 'Docente Atribuído'), ('TUITION_OVERDUE', 'Propina em Atraso (Suspender)'), ('TUITION_SETTLED', 'Propina Regularizada (Reativar)'), ('ENROLLMENT_TRANSFERRED', 'Transferência / Saída')], default='STUDENT_ENROLLED', max_length=30, verbose_name='Tipo de Evento')),
                ('payload', models.JSONField(default=dict, verbose_name='Payload Bruto')),
                ('processing_status', models.CharField(choices=[('RECEIVED', 'Recebido'), ('PROCESSED', 'Processado'), ('FAILED', 'Falhou'), ('IGNORED', 'Ignorado (Duplicado)')], default='RECEIVED', max_length=20, verbose_name='Estado')),
                ('detail', models.TextField(blank=True, verbose_name='Detalhes')),
                ('processed_at', models.DateTimeField(blank=True, null=True, verbose_name='Processado em')),
                ('affected_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='erp_events', to='directory.academicuser', verbose_name='Utilizador Afetado')),
                ('connection', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='erp_sync.erpconnection', verbose_name='Ligação ERP')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='erp_events', to='tenants.school', verbose_name='Escola (Tenant)')),
            ],
            options={
                'verbose_name': 'Evento ERP',
                'verbose_name_plural': 'Eventos ERP',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='erpsyncevent',
            index=models.Index(fields=['school', 'provider', 'created_at'], name='erp_sync_er_school__4a8102_idx'),
        ),
        migrations.AddIndex(
            model_name='erpsyncevent',
            index=models.Index(fields=['connection', 'event_id'], name='erp_sync_er_connect_8f0e41_idx'),
        ),
    ]
