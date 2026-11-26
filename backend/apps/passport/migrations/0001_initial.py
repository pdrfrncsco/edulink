import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('tenants', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='GlobalVerifierApplication',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('verifier', models.CharField(choices=[('SHEERID', 'SheerID (Spotify, Google AI, Autodesk)'), ('UNIDAYS', 'UNiDAYS (Apple Education, Descontos Globais)'), ('GITHUB_EDUCATION', 'GitHub Education Campus (Student Pack)')], max_length=30, verbose_name='Verificador Global')),
                ('status', models.CharField(choices=[('NOT_STARTED', 'Não Iniciado'), ('DOSSIER_READY', 'Pacote de Credenciação Pronto'), ('SUBMITTED', 'Submetido para Auditoria'), ('APPROVED', 'Aprovado / Elegível')], default='NOT_STARTED', max_length=20, verbose_name='Estado')),
                ('official_website_url', models.URLField(blank=True, verbose_name='URL Oficial do Site (.edu.ao)')),
                ('submission_reference', models.CharField(blank=True, max_length=120, verbose_name='Referência / Ticket de Submissão')),
                ('readiness_snapshot', models.JSONField(blank=True, default=dict, verbose_name='Diagnóstico de Prontidão')),
                ('notes', models.TextField(blank=True, verbose_name='Notas de Auditoria')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='verifier_applications', to='tenants.school', verbose_name='Escola / IES (Tenant)')),
            ],
            options={
                'verbose_name': 'Credenciação em Verificador Global',
                'verbose_name_plural': 'Credenciações em Verificadores Globais',
                'ordering': ['school__name', 'verifier'],
                'unique_together': {('school', 'verifier')},
            },
        ),
    ]
