import secrets
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsPlatformAdminOrSchoolSecretary, get_user_profile, is_platform_admin
from apps.directory.models import AcademicUser, Enrollment
from apps.passport.services.jwt_signer import verify_passport_token
from .models import BenefitOffer, BenefitPartner, BenefitRedemption
from .serializers import (
    BenefitOfferSerializer,
    BenefitPartnerSerializer,
    BenefitRedemptionSerializer,
)


class BenefitPartnerViewSet(viewsets.ModelViewSet):
    """Parceiros do Clube de Benefícios (leitura para autenticados; gestão para administração)."""
    queryset = BenefitPartner.objects.all()
    serializer_class = BenefitPartnerSerializer
    filterset_fields = ['category', 'is_active']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsPlatformAdminOrSchoolSecretary()]

    @action(detail=True, methods=['post'], url_path='rotate-api-key')
    def rotate_api_key(self, request, pk=None):
        """Gera uma nova chave de API do parceiro; restrito a administradores da plataforma."""
        if not is_platform_admin(request.user) and not getattr(request.user, 'is_superuser', False):
            raise PermissionDenied('Apenas administradores da plataforma podem gerar chaves API de parceiros.')
        partner = self.get_object()
        raw_key = partner.generate_api_key()
        partner.save(update_fields=['partner_api_key_hash'])
        return Response({'partner_id': str(partner.id), 'api_key': raw_key})


class BenefitOfferViewSet(viewsets.ModelViewSet):
    """Ofertas de benefícios e pacotes educativos em Kwanzas."""
    queryset = BenefitOffer.objects.select_related('partner').all()
    serializer_class = BenefitOfferSerializer
    filterset_fields = ['partner', 'is_active']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsPlatformAdminOrSchoolSecretary()]


class BenefitCatalogAPIView(generics.ListAPIView):
    """
    Catálogo filtrado para o utilizador autenticado (filtra por role STUDENT/TEACHER
    quando aplicável).
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BenefitOfferSerializer
    pagination_class = None

    def get_queryset(self):
        qs = BenefitOffer.objects.select_related('partner').filter(is_active=True, partner__is_active=True)
        profile = get_user_profile(self.request.user)
        if profile and profile.academic_user:
            role = profile.academic_user.role
            eligible_ids = [
                offer.id for offer in qs if not offer.partner.eligible_roles or role in offer.partner.eligible_roles
            ]
            return qs.filter(id__in=eligible_ids)
        return qs


class BenefitRedeemAPIView(APIView):
    """
    Resgate de benefício:
    1) Via Portal PWA (utilizador autenticado com AcademicUser ativo)
    2) Via POS Parceiro (cabeçalho X-Partner-Api-Key + passport_token QR Code)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        offer_id = request.data.get('offer_id')
        passport_token = (request.data.get('passport_token') or '').strip()
        partner_key = request.META.get('HTTP_X_PARTNER_API_KEY', '').strip()

        offer = BenefitOffer.objects.select_related('partner').filter(
            id=offer_id, is_active=True, partner__is_active=True
        ).first()
        if not offer:
            return Response({'detail': 'Oferta de benefício não encontrada ou inativa.'}, status=status.HTTP_404_NOT_FOUND)

        academic_user = None
        verification_method = BenefitRedemption.VerificationMethod.PORTAL_ONLINE

        if partner_key:
            if not offer.partner.verify_api_key(partner_key):
                return Response({'detail': 'API Key do parceiro inválida.'}, status=status.HTTP_401_UNAUTHORIZED)
            if not passport_token:
                return Response({'detail': 'passport_token (QR Code) é obrigatório para validação POS.'}, status=status.HTTP_400_BAD_REQUEST)
            verification = verify_passport_token(passport_token)
            if not verification.get('is_valid'):
                return Response({'detail': verification.get('error', 'Cartão inválido ou suspenso.')}, status=status.HTTP_400_BAD_REQUEST)
            email = verification['student_info']['institutional_email']
            academic_user = AcademicUser.objects.select_related('school').filter(institutional_email=email).first()
            verification_method = BenefitRedemption.VerificationMethod.PARTNER_API
        else:
            if not request.user or not request.user.is_authenticated:
                return Response({'detail': 'Autenticação necessária para resgatar benefício.'}, status=status.HTTP_401_UNAUTHORIZED)
            profile = get_user_profile(request.user)
            if not profile or not profile.academic_user_id:
                raise PermissionDenied('Apenas titulares académicos (Estudantes/Docentes) podem resgatar benefícios.')
            academic_user = AcademicUser.objects.select_related('school').filter(id=profile.academic_user_id).first()

        if not academic_user or not academic_user.is_active:
            return Response({'detail': 'Conta académica inativa.'}, status=status.HTTP_403_FORBIDDEN)

        if offer.requires_active_enrollment:
            latest = academic_user.enrollments.order_by('-created_at').first()
            if latest and latest.status == Enrollment.Status.SUSPENDED:
                return Response({'detail': 'Matrícula suspensa: benefício indisponível.'}, status=status.HTTP_403_FORBIDDEN)

        allowed_roles = offer.partner.eligible_roles or ['STUDENT', 'TEACHER']
        if academic_user.role not in allowed_roles:
            return Response(
                {'detail': f'Oferta exclusiva para perfis {", ".join(allowed_roles)}.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        voucher_code = f"YETU-{secrets.token_hex(4).upper()}"
        redemption = BenefitRedemption.objects.create(
            offer=offer,
            partner=offer.partner,
            user=academic_user,
            school=academic_user.school,
            verification_method=verification_method,
            voucher_code=voucher_code,
        )
        return Response(BenefitRedemptionSerializer(redemption).data, status=status.HTTP_201_CREATED)


class BenefitRedemptionViewSet(viewsets.ReadOnlyModelViewSet):
    """Histórico de resgates do utilizador autenticado ou da escola."""
    queryset = BenefitRedemption.objects.select_related('offer', 'partner', 'user', 'school').all()
    serializer_class = BenefitRedemptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if is_platform_admin(self.request.user):
            return qs
        profile = get_user_profile(self.request.user)
        if not profile:
            return qs.none()
        if profile.academic_user_id:
            return qs.filter(user_id=profile.academic_user_id)
        if profile.school_id:
            return qs.filter(school_id=profile.school_id)
        return qs.none()
