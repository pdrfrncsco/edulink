import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tenants', '0001_initial'),
        ('directory', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('role', models.CharField(choices=[('PLATFORM_ADMIN', 'Administrador da Plataforma EduLink'), ('SCHOOL_SECRETARY', 'Secretaria / Direção Escolar'), ('TEACHER', 'Professor / Docente'), ('STUDENT', 'Estudante')], default='SCHOOL_SECRETARY', max_length=30, verbose_name='Papel RBAC')),
                ('academic_user', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='account_profile', to='directory.academicuser', verbose_name='Registo Académico Associado')),
                ('school', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='staff_profiles', to='tenants.school', verbose_name='Escola (Tenant)')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='edulink_profile', to=settings.AUTH_USER_MODEL, verbose_name='Utilizador Django')),
            ],
            options={
                'verbose_name': 'Perfil de Acesso (RBAC)',
                'verbose_name_plural': 'Perfis de Acesso (RBAC)',
            },
        ),
    ]
