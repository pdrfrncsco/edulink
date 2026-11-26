from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import (
    IsPlatformAdminOrSchoolSecretary,
    TenantScopedMixin,
    get_user_profile,
    is_platform_admin,
)
from apps.directory.models import AcademicUser
from apps.tenants.models import School
from .models import GlobalVerifierApplication
from .serializers import GlobalVerifierApplicationSerializer
from .services.jwt_signer import generate_passport_token, verify_passport_token


def build_institution_dossier(school: School) -> dict:
    dns_config = getattr(school, 'dns_config', None)
    dns_status = dns_config.registrar_status if dns_config else 'NOT_CONFIGURED'
    students_count = school.academic_users.filter(role=AcademicUser.Role.STUDENT, is_active=True).count()
    teachers_count = school.academic_users.filter(role=AcademicUser.Role.TEACHER, is_active=True).count()
    return {
        'institution_name': school.name,
        'domain': school.domain,
        'official_website': f"https://{school.domain}",
        'country': 'AO',
        'province': school.province,
        'municipality': school.municipality,
        'nif': school.nif,
        'alvara_med_mescti': school.alvara_med_mescti,
        'contact_email': school.contact_email,
        'apd_notified': school.apd_notified,
        'apd_dossier_number': school.apd_dossier_number,
        'dns_status': dns_status,
        'active_students': students_count,
        'active_teachers': teachers_count,
        'email_domain_pattern': f"*@{school.domain}",
        'passport_verification_endpoint': '/api/v1/passport/verify/',
    }


class IssuePassportTokenAPIView(APIView):
    """
    Gera o token JWT assinado para o QR Code do Cartão Académico Digital.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = get_user_profile(request.user)
        if not profile:
            raise PermissionDenied('Perfil de acesso não encontrado.')

        requested_user_id = request.data.get('user_id')

        if profile.role in ('STUDENT', 'TEACHER'):
            if not profile.academic_user_id:
                return Response(
                    {'detail': 'Conta sem registo académico associado.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if requested_user_id and str(requested_user_id) != str(profile.academic_user_id):
                raise PermissionDenied('Não tem permissão para emitir o cartão de outro utilizador.')
            user = AcademicUser.objects.filter(id=profile.academic_user_id).select_related('school').first()
        else:
            if not requested_user_id:
                return Response({'detail': 'user_id é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
            user = AcademicUser.objects.filter(id=requested_user_id).select_related('school').first()
            if not user:
                return Response({'detail': 'Utilizador não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
            if not is_platform_admin(request.user) and str(user.school_id) != str(profile.school_id):
                raise PermissionDenied('Não tem permissão para emitir cartões noutra escola.')

        if not user:
            return Response({'detail': 'Utilizador não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        token = generate_passport_token(user)
        base_url = getattr(settings, 'YETUEDU_PUBLIC_BASE_URL', 'http://localhost:3000').rstrip('/')
        verification_url = f"{base_url}/verify?token={token}"

        return Response({
            'user_id': str(user.id),
            'full_name': user.full_name,
            'institutional_email': user.institutional_email,
            'school_name': user.school.name,
            'school_domain': user.school.domain,
            'token': token,
            'verification_url': verification_url,
            'qr_payload': token,
        })


class VerifyPassportAPIView(APIView):
    """
    Endpoint público de verificação de QR Code para portarias, parceiros locais e SheerID.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get('token', '').strip()
        if not token:
            return Response(
                {'is_valid': False, 'error': 'Parâmetro token não fornecido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = verify_passport_token(token)
        if not result.get('is_valid'):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)


class InstitutionDossierPublicAPIView(APIView):
    """
    Endpoint público de transparência institucional para auditoria por SheerID,
    UNiDAYS e GitHub Education Campus.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        domain = (request.query_params.get('domain') or '').strip().lower()
        school = School.objects.filter(domain=domain, is_active=True).first() if domain else None
        if not school:
            return Response({'detail': 'Instituição não encontrada para este domínio.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(build_institution_dossier(school), status=status.HTTP_200_OK)


class GlobalVerifierApplicationViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """
    Gestão de candidaturas da instituição à SheerID, UNiDAYS e GitHub Education.
    """
    queryset = GlobalVerifierApplication.objects.select_related('school').all()
    serializer_class = GlobalVerifierApplicationSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    filterset_fields = ['school', 'verifier', 'status']

    @action(detail=True, methods=['post'], url_path='prepare-packet')
    def prepare_packet(self, request, pk=None):
        app = self.get_object()
        school = app.school
        dossier = build_institution_dossier(school)

        checks = {
            'official_edu_ao_domain': school.domain.endswith('.edu.ao'),
            'alvara_med_mescti_present': bool(school.alvara_med_mescti),
            'dns_active': dossier['dns_status'] == 'ACTIVE',
            'apd_notified': school.apd_notified,
            'has_active_academic_users': (dossier['active_students'] + dossier['active_teachers']) > 0,
        }
        snapshot = {
            'checks': checks,
            'ready_for_submission': checks['official_edu_ao_domain'] and checks['alvara_med_mescti_present'],
            'institution_dossier': dossier,
        }
        app.official_website_url = app.official_website_url or dossier['official_website']
        app.readiness_snapshot = snapshot
        if app.status == GlobalVerifierApplication.Status.NOT_STARTED and snapshot['ready_for_submission']:
            app.status = GlobalVerifierApplication.Status.DOSSIER_READY
        app.save(update_fields=['official_website_url', 'readiness_snapshot', 'status'])

        return Response(self.get_serializer(app).data, status=status.HTTP_200_OK)
