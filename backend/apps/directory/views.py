from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.core.notifications import send_academic_activation_email
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
from .tasks import send_academic_activation_email_task


class AcademicUserViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """Directório completo de estudantes e professores isolado por escola."""
    queryset = AcademicUser.objects.all().select_related('school').order_by('full_name', 'id')
    serializer_class = AcademicUserSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    search_fields = ['full_name', 'institutional_email', 'bi_or_student_id']
    filterset_fields = ['school', 'role', 'is_active']

    @action(detail=True, methods=['post'], url_path='send-activation-email')
    def send_activation_email(self, request, pk=None):
        """Envia o convite de ativação da conta institucional (.edu.ao) ao utilizador."""
        academic_user = self.get_object()
        recipient_email = (request.data.get('email') or '').strip()
        run_async = str(request.query_params.get('async', 'false')).lower() == 'true'

        if run_async:
            target = recipient_email or academic_user.personal_email or academic_user.institutional_email
            task = send_academic_activation_email_task.delay(str(academic_user.id), target)
            return Response({'status': 'queued', 'task_id': str(task.id), 'recipient': target}, status=status.HTTP_202_ACCEPTED)

        try:
            info = send_academic_activation_email(academic_user, recipient_email=recipient_email or None)
            return Response({'message': f"Convite de ativação enviado para {info['recipient']}.", **info}, status=status.HTTP_200_OK)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='send-bulk-activation-emails')
    def send_bulk_activation_emails(self, request):
        """Envia convites de ativação em lote para contas ativas ainda não ativadas no Portal."""
        school_id = request.data.get('school_id')
        if not school_id:
            return Response({'detail': 'school_id é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        if not is_platform_admin(request.user):
            profile = get_user_profile(request.user)
            if not profile or not profile.school_id or str(profile.school_id) != str(school_id):
                raise PermissionDenied('Não tem permissão para enviar convites noutra escola.')

        run_async = str(request.query_params.get('async', 'false')).lower() == 'true'
        pending_users = AcademicUser.objects.select_related('school').filter(
            school_id=school_id,
            is_active=True,
            account_profile__isnull=True,
        )
        sent = 0
        for academic_user in pending_users:
            target = (academic_user.personal_email or '').strip() or (academic_user.institutional_email or '').strip()
            if not target:
                continue
            if run_async:
                send_academic_activation_email_task.delay(str(academic_user.id), target)
            else:
                send_academic_activation_email(academic_user, recipient_email=target)
            sent += 1

        return Response({'sent': sent, 'async': run_async}, status=status.HTTP_200_OK)


class EnrollmentViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """Gestão de matrículas e turmas por ano lectivo isolada por escola."""
    queryset = Enrollment.objects.all().select_related('user', 'school').order_by('-academic_year', 'user__full_name', 'id')
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
