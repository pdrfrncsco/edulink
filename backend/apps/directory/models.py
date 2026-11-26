from django.db import models
from apps.core.models import UUIDModel, TimeStampedModel
from apps.tenants.models import School


class AcademicUser(UUIDModel, TimeStampedModel):
    """
    Centraliza a identidade digital única de cada estudante ou docente
    vinculado a uma instituição de ensino (Tenant).
    """
    class Role(models.TextChoices):
        STUDENT = "STUDENT", "Estudante"
        TEACHER = "TEACHER", "Professor / Docente"
        STAFF = "STAFF", "Funcionário Administrativo"

    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name="academic_users",
        verbose_name="Escola (Tenant)"
    )
    full_name = models.CharField(
        max_length=255,
        verbose_name="Nome Completo"
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
        verbose_name="Papel Académico"
    )
    institutional_email = models.EmailField(
        unique=True,
        verbose_name="E-mail Institucional (.edu.ao)",
        help_text="Endereço padronizado atribuído: nome.apelido@escola.edu.ao"
    )
    bi_or_student_id = models.CharField(
        max_length=50,
        verbose_name="N.º de BI ou Processo de Matrícula",
        help_text="Número do Bilhete de Identidade ou processo interno do colégio"
    )
    phone = models.CharField(
        max_length=30,
        blank=True,
        verbose_name="Telefone Pessoal"
    )
    personal_email = models.EmailField(
        blank=True,
        null=True,
        verbose_name="E-mail Pessoal / Recuperação"
    )

    # Identificadores Externos nos Provedores de Nuvem
    external_google_id = models.CharField(
        max_length=120,
        blank=True,
        null=True,
        verbose_name="ID Google Workspace (Directory API)"
    )
    external_ms_id = models.CharField(
        max_length=120,
        blank=True,
        null=True,
        verbose_name="ID Microsoft 365 (Entra ID Object ID)"
    )

    is_active = models.BooleanField(
        default=True,
        verbose_name="Ativo"
    )

    class Meta:
        verbose_name = "Utilizador Académico"
        verbose_name_plural = "Utilizadores Académicos"
        unique_together = ('school', 'bi_or_student_id')
        indexes = [
            models.Index(fields=['school', 'role']),
            models.Index(fields=['institutional_email']),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.institutional_email}) - {self.get_role_display()}"


class Enrollment(UUIDModel, TimeStampedModel):
    """
    Controla o vínculo da matrícula anual de um utilizador a uma turma.
    A alteração do estado para SUSPENDED dispara automaticamente a suspensão
    de licenças no Google/Microsoft e invalidação do Cartão Digital (QR Code).
    """
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Matrícula Ativa"
        SUSPENDED = "SUSPENDED", "Suspensa (Inadimplência / Disciplinar)"
        TRANSFERRED = "TRANSFERRED", "Transferido"
        GRADUATED = "GRADUATED", "Concluído / Antigo Aluno"

    user = models.ForeignKey(
        AcademicUser,
        on_delete=models.CASCADE,
        related_name="enrollments",
        verbose_name="Utilizador Académico"
    )
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name="enrollments",
        verbose_name="Escola (Tenant)"
    )
    academic_year = models.CharField(
        max_length=20,
        default="2026/2027",
        verbose_name="Ano Lectivo",
        help_text="Ex: 2026/2027"
    )
    grade_class = models.CharField(
        max_length=100,
        verbose_name="Classe / Turma / Curso",
        help_text="Ex: 10ª Classe - Turma A ou 3º Ano Engenharia Informática"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        verbose_name="Estado da Matrícula"
    )

    class Meta:
        verbose_name = "Matrícula / Vínculo"
        verbose_name_plural = "Matrículas / Vínculos"
        unique_together = ('user', 'school', 'academic_year')
        indexes = [
            models.Index(fields=['school', 'status']),
            models.Index(fields=['academic_year']),
        ]

    def __str__(self):
        return f"{self.user.full_name} - {self.grade_class} ({self.academic_year}) [{self.get_status_display()}]"
