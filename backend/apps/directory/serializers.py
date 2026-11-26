from rest_framework import serializers
from .models import AcademicUser, Enrollment


class EnrollmentSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    user_name = serializers.ReadOnlyField(source='user.full_name')
    institutional_email = serializers.ReadOnlyField(source='user.institutional_email')

    class Meta:
        model = Enrollment
        fields = [
            'id',
            'user',
            'user_name',
            'institutional_email',
            'school',
            'school_name',
            'academic_year',
            'grade_class',
            'status',
            'created_at',
            'updated_at',
        ]


class AcademicUserSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    active_enrollment = serializers.SerializerMethodField()

    class Meta:
        model = AcademicUser
        fields = [
            'id',
            'school',
            'school_name',
            'full_name',
            'role',
            'institutional_email',
            'bi_or_student_id',
            'phone',
            'personal_email',
            'external_google_id',
            'external_ms_id',
            'is_active',
            'active_enrollment',
            'created_at',
        ]
        read_only_fields = ['institutional_email', 'external_google_id', 'external_ms_id']

    def get_active_enrollment(self, obj):
        latest = obj.enrollments.order_by('-created_at').first()
        if latest:
            return {
                'id': str(latest.id),
                'academic_year': latest.academic_year,
                'grade_class': latest.grade_class,
                'status': latest.status,
            }
        return None


class CSVImportUploadSerializer(serializers.Serializer):
    school_id = serializers.UUIDField(help_text="UUID da instituição escolar")
    file = serializers.FileField(help_text="Ficheiro CSV com colunas: nome, bi, papel, turma, ano_lectivo")
    academic_year = serializers.CharField(
        max_length=20,
        required=False,
        default="2026/2027",
        help_text="Ano lectivo de referência (padrão: 2026/2027)"
    )
