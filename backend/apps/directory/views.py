from rest_framework import generics, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.core.permissions import (
    IsPlatformAdminOrSchoolSecretary,
    TenantScopedMixin,
    get_user_profile,
    is_platform_admin,
)
from apps.tenants.models import School
from .models import AcademicUser, Enrollment
from .serializers import (
    AcademicUserSerializer,
    CSVImportUploadSerializer,
    EnrollmentSerializer,
)
from .services.csv_importer import CSVImporterService


class AcademicUserViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """Directório completo de estudantes e professores isolado por escola."""
    queryset = AcademicUser.objects.all().select_related('school')
    serializer_class = AcademicUserSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    search_fields = ['full_name', 'institutional_email', 'bi_or_student_id']
    filterset_fields = ['school', 'role', 'is_active']


class EnrollmentViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """Gestão de matrículas e turmas por ano lectivo isolada por escola."""
    queryset = Enrollment.objects.all().select_related('user', 'school')
    serializer_class = EnrollmentSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    search_fields = ['user__full_name', 'user__institutional_email', 'grade_class']
    filterset_fields = ['school', 'status', 'academic_year']


class CSVImportAPIView(generics.CreateAPIView):
    """
    Endpoint para envio em lote de listas de turmas e matrículas.
    Gera automaticamente os e-mails .edu.ao restrito à escola do utilizador.
    """
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = CSVImportUploadSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        school_id = serializer.validated_data['school_id']
        file_obj = serializer.validated_data['file']
        academic_year = serializer.validated_data.get('academic_year', '2026/2027')

        if not is_platform_admin(request.user):
            profile = get_user_profile(request.user)
            if not profile or not profile.school_id or str(profile.school_id) != str(school_id):
                raise PermissionDenied('Não tem permissão para importar utilizadores noutra instituição.')

        school = School.objects.filter(id=school_id).first()
        if not school:
            return Response(
                {'detail': 'Escola não encontrada para o ID fornecido.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            stats = CSVImporterService.import_directory_csv(
                school=school,
                file_content_or_stream=file_obj,
                default_academic_year=academic_year,
            )
            return Response({
                'message': 'Ficheiro CSV processado com sucesso.',
                'school': school.name,
                'domain': school.domain,
                'stats': stats,
            }, status=status.HTTP_200_OK)
        except Exception as exc:
            return Response(
                {'detail': f'Erro ao processar ficheiro CSV: {str(exc)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )
