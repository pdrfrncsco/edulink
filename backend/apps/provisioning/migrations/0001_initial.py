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
            name='ProvisioningLog',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('provider', models.CharField(choices=[('GOOGLE', 'Google Workspace for Education'), ('MICROSOFT', 'Microsoft 365 Education (A1/Entra ID)')], max_length=20, verbose_name='Provedor')),
                ('action', models.CharField(choices=[('PROVISION', 'Provisionamento / Criação'), ('REACTIVATE', 'Reativação'), ('SUSPEND', 'Suspensão / Revogação'), ('TEST', 'Teste de Ligação')], max_length=20, verbose_name='Ação')),
                ('status', models.CharField(choices=[('SUCCESS', 'Sucesso'), ('SANDBOX', 'Simulado (Sandbox)'), ('FAILED', 'Falhou')], max_length=20, verbose_name='Estado')),
                ('external_id', models.CharField(blank=True, max_length=120, verbose_name='ID Externo')),
                ('detail', models.TextField(blank=True, verbose_name='Detalhes / Mensagem')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='provisioning_logs', to='tenants.school', verbose_name='Escola')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='provisioning_logs', to='directory.academicuser', verbose_name='Utilizador Académico')),
            ],
            options={
                'verbose_name': 'Log de Provisionamento',
                'verbose_name_plural': 'Logs de Provisionamento',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='provisioninglog',
            index=models.Index(fields=['school', 'provider', 'created_at'], name='provisionin_school__5b6f01_idx'),
        ),
    ]
