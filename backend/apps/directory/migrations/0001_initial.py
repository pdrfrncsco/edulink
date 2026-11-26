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
            name='AcademicUser',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('full_name', models.CharField(max_length=255, verbose_name='Nome Completo')),
                ('role', models.CharField(choices=[('STUDENT', 'Estudante'), ('TEACHER', 'Professor / Docente'), ('STAFF', 'Funcionário Administrativo')], default='STUDENT', max_length=20, verbose_name='Papel Académico')),
                ('institutional_email', models.EmailField(help_text='Endereço padronizado atribuído: nome.apelido@escola.edu.ao', max_length=254, unique=True, verbose_name='E-mail Institucional (.edu.ao)')),
                ('bi_or_student_id', models.CharField(help_text='Número do Bilhete de Identidade ou processo interno do colégio', max_length=50, verbose_name='N.º de BI ou Processo de Matrícula')),
                ('phone', models.CharField(blank=True, max_length=30, verbose_name='Telefone Pessoal')),
                ('personal_email', models.EmailField(blank=True, max_length=254, null=True, verbose_name='E-mail Pessoal / Recuperação')),
                ('external_google_id', models.CharField(blank=True, max_length=120, null=True, verbose_name='ID Google Workspace (Directory API)')),
                ('external_ms_id', models.CharField(blank=True, max_length=120, null=True, verbose_name='ID Microsoft 365 (Entra ID Object ID)')),
                ('is_active', models.BooleanField(default=True, verbose_name='Ativo')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='academic_users', to='tenants.school', verbose_name='Escola (Tenant)')),
            ],
            options={
                'verbose_name': 'Utilizador Académico',
                'verbose_name_plural': 'Utilizadores Académicos',
            },
        ),
        migrations.CreateModel(
            name='Enrollment',
            fields=[
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Criado em')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Atualizado em')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, verbose_name='Identificador Único')),
                ('academic_year', models.CharField(default='2026/2027', help_text='Ex: 2026/2027', max_length=20, verbose_name='Ano Lectivo')),
                ('grade_class', models.CharField(help_text='Ex: 10ª Classe - Turma A ou 3º Ano Engenharia Informática', max_length=100, verbose_name='Classe / Turma / Curso')),
                ('status', models.CharField(choices=[('ACTIVE', 'Matrícula Ativa'), ('SUSPENDED', 'Suspensa (Inadimplência / Disciplinar)'), ('TRANSFERRED', 'Transferido'), ('GRADUATED', 'Concluído / Antigo Aluno')], default='ACTIVE', max_length=20, verbose_name='Estado da Matrícula')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='enrollments', to='tenants.school', verbose_name='Escola (Tenant)')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='enrollments', to='directory.academicuser', verbose_name='Utilizador Académico')),
            ],
            options={
                'verbose_name': 'Matrícula / Vínculo',
                'verbose_name_plural': 'Matrículas / Vínculos',
            },
        ),
        migrations.AddIndex(
            model_name='academicuser',
            index=models.Index(fields=['school', 'role'], name='directory_a_school__cb4966_idx'),
        ),
        migrations.AddIndex(
            model_name='academicuser',
            index=models.Index(fields=['institutional_email'], name='directory_a_institu_9ef635_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='academicuser',
            unique_together={('school', 'bi_or_student_id')},
        ),
        migrations.AddIndex(
            model_name='enrollment',
            index=models.Index(fields=['school', 'status'], name='directory_e_school__98e8a7_idx'),
        ),
        migrations.AddIndex(
            model_name='enrollment',
            index=models.Index(fields=['academic_year'], name='directory_e_academi_6718cf_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='enrollment',
            unique_together={('user', 'school', 'academic_year')},
        ),
    ]
