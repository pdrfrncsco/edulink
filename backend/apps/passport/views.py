from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import get_user_profile, is_platform_admin
from apps.directory.models import AcademicUser
from .services.jwt_signer import generate_passport_token, verify_passport_token


class IssuePassportTokenAPIView(APIView):
    """
    Gera o token JWT assinado para o QR Code do Cartão Académico Digital.
    - Estudantes/Docentes recebem apenas o seu próprio cartão.
    - Secretaria pode emitir para utilizadores da sua própria escola.
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
        base_url = getattr(settings, 'EDULINK_PUBLIC_BASE_URL', 'http://localhost:3000').rstrip('/')
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
    Endpoint público de verificação de QR Code consumido por:
    - Parceiros locais (Livrarias, Unitel/Africell, cinemas)
    - Verificadores globais (SheerID, UNiDAYS)
    - Portaria/Segurança física da escola
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
