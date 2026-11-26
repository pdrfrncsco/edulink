from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import (
    IsPlatformAdminOrSchoolSecretary,
    get_user_profile,
    is_platform_admin,
)
from apps.directory.models import AcademicUser
from apps.tenants.models import School
from .serializers import (
    ActivateAcademicAccountSerializer,
    LoginSerializer,
    RegisterSecretarySerializer,
    build_user_payload,
    issue_jwt_pair_for_user,
)
from .services.keycloak_service import KeycloakAdminService, KeycloakSyncError


class LoginAPIView(APIView):
    """Autenticação de Secretaria, Professores, Alunos e Administração EduLink via JWT."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(issue_jwt_pair_for_user(serializer.validated_data['user']), status=status.HTTP_200_OK)


class RegisterSecretaryAPIView(APIView):
    """Regista uma nova conta de Secretaria Escolar antes do onboarding da escola."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSecretarySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(issue_jwt_pair_for_user(user), status=status.HTTP_201_CREATED)


class ActivateAcademicAccountAPIView(APIView):
    """Permite a um estudante/professor importado via CSV definir palavra-passe e entrar no PWA."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ActivateAcademicAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(issue_jwt_pair_for_user(user), status=status.HTTP_201_CREATED)


class MeAPIView(APIView):
    """Devolve o perfil autenticado, escola vinculada e dados académicos do utilizador."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(build_user_payload(request.user), status=status.HTTP_200_OK)


class SSOMetadataAPIView(APIView):
    """Devolve os endpoints OIDC/SAML 2.0 do Keycloak e configuração para Canva Educação."""
    permission_classes = [IsPlatformAdminOrSchoolSecretary]

    def get(self, request):
        school_id = request.query_params.get('school_id')
        profile = get_user_profile(request.user)
        if not is_platform_admin(request.user):
            if not profile or not profile.school_id:
                raise PermissionDenied('Conta de secretaria sem escola vinculada.')
            if school_id and str(school_id) != str(profile.school_id):
                raise PermissionDenied('Não tem permissão para aceder aos metadados SSO de outra escola.')
            school_id = str(profile.school_id)

        school = School.objects.filter(id=school_id).first() if school_id else None
        if not school:
            return Response({'detail': 'Escola não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        service = KeycloakAdminService()
        return Response(service.get_sso_metadata(school), status=status.HTTP_200_OK)


class SyncKeycloakAPIView(APIView):
    """Sincroniza utilizadores ativos da escola com o Realm Keycloak."""
    permission_classes = [IsPlatformAdminOrSchoolSecretary]

    def post(self, request, school_id):
        profile = get_user_profile(request.user)
        if not is_platform_admin(request.user):
            if not profile or not profile.school_id or str(profile.school_id) != str(school_id):
                raise PermissionDenied('Não tem permissão para sincronizar outra escola.')

        school = School.objects.filter(id=school_id).first()
        if not school:
            return Response({'detail': 'Escola não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        sandbox_flag = bool(request.data.get('sandbox', False))
        service = KeycloakAdminService(sandbox=sandbox_flag)
        users = AcademicUser.objects.select_related('school').filter(school=school)

        synced = []
        try:
            for academic_user in users:
                synced.append(service.sync_academic_user(academic_user))
            return Response({
                'school': school.domain,
                'realm': service.realm,
                'synced_count': len(synced),
                'sandbox': service.is_sandbox,
                'results': synced,
            })
        except KeycloakSyncError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
