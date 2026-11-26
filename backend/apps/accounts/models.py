from django.conf import settings
from django.db import models
from apps.core.models import TimeStampedModel, UUIDModel
from apps.directory.models import AcademicUser
from apps.tenants.models import School


class UserProfile(UUIDModel, TimeStampedModel):
    """
    Perfil de autorização (RBAC) e vínculo ao Tenant escolar para utilizadores
    autenticados nos portais EduLink (Secretaria, Docente e Estudante).
    """
    class Role(models.TextChoices):
        PLATFORM_ADMIN = 'PLATFORM_ADMIN', 'Administrador da Plataforma EduLink'
        SCHOOL_SECRETARY = 'SCHOOL_SECRETARY', 'Secretaria / Direção Escolar'
        TEACHER = 'TEACHER', 'Professor / Docente'
        STUDENT = 'STUDENT', 'Estudante'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='edulink_profile',
        verbose_name='Utilizador Django',
    )
    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.SCHOOL_SECRETARY,
        verbose_name='Papel RBAC',
    )
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='staff_profiles',
        verbose_name='Escola (Tenant)',
    )
    academic_user = models.OneToOneField(
        AcademicUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='account_profile',
        verbose_name='Registo Académico Associado',
    )

    class Meta:
        verbose_name = 'Perfil de Acesso (RBAC)'
        verbose_name_plural = 'Perfis de Acesso (RBAC)'

    def __str__(self):
        school_label = self.school.domain if self.school else 'Global'
        return f"{self.user.username} [{self.role}] ({school_label})"