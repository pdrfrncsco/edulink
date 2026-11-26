from django.conf import settings
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import (
    IsPlatformAdminOrSchoolSecretary,
    TenantScopedMixin,
    get_user_profile,
    is_platform_admin,
)
from .models import CloudIntegration, School
from .serializers import (
    CloudIntegrationSerializer,
    SchoolOnboardSerializer,
    SchoolPublicSerializer,
    SchoolSerializer,
)


class SchoolViewSet(viewsets.ModelViewSet):
    """
    CRUD das instituições de ensino (Tenants).
    Administradores veem todas; Secretarias veem apenas a sua escola.
    """
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    search_fields = ['name', 'domain', 'nif', 'alvara_med_mescti']
    filterset_fields = ['is_active', 'province', 'apd_notified']

    def get_queryset(self):
        qs = super().get_queryset()
        if is_platform_admin(self.request.user):
            return qs
        profile = get_user_profile(self.request.user)
        if not profile or not profile.school_id:
            return qs.none()
        return qs.filter(id=profile.school_id)

    def perform_create(self, serializer):
        if is_platform_admin(self.request.user):
            serializer.save()
            return
        profile = get_user_profile(self.request.user)
        if profile and profile.school_id:
            raise PermissionDenied('A sua conta já está vinculada a uma instituição.')
        school = serializer.save()
        if profile:
            profile.school = school
            profile.save(update_fields=['school'])

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        school = self.get_object()
        school.is_active = not school.is_active
        school.save()
        return Response({
            'status': 'updated',
            'is_active': school.is_active,
            'message': f"A instituição {school.name} está agora {'ativa' if school.is_active else 'inativa'}.",
        })


class SchoolPublicDetailView(generics.RetrieveAPIView):
    """
    Endpoint público consumido pelo middleware e pelo Next.js
    para obter a configuração e o conteúdo institucional do domínio .edu.ao.
    """
    permission_classes = [AllowAny]
    serializer_class = SchoolPublicSerializer

    def get_object(self):
        domain = self.request.query_params.get('domain', '').strip().lower()
        if not domain:
            return None
        school = School.objects.filter(domain=domain, is_active=True).first()
        if not school:
            clean_sub = domain.split('.')[0]
            school = School.objects.filter(domain__istartswith=clean_sub, is_active=True).first()
        return school

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance:
            return Response(
                {'detail': 'Escola não encontrada para este domínio ou subdomínio.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class SchoolOnboardAPIView(generics.CreateAPIView):
    """
    Endpoint de Onboarding para adesão de uma nova escola por conta autenticada.
    Vincula automaticamente a escola criada ao perfil da secretaria solicitante.
    """
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    serializer_class = SchoolOnboardSerializer

    def create(self, request, *args, **kwargs):
        profile = get_user_profile(request.user)
        if not is_platform_admin(request.user) and profile and profile.school_id:
            raise PermissionDenied('A sua conta de secretaria já possui uma instituição associada.')

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        school = serializer.save()

        if profile and not profile.school_id and not is_platform_admin(request.user):
            profile.school = school
            profile.save(update_fields=['school'])

        return Response({
            'message': 'Instituição registada com sucesso na EduLink.',
            'school_id': str(school.id),
            'domain': school.domain,
            'next_steps': [
                'Configuração de registos DNS (MX, TXT, SPF, DKIM)',
                'Submissão do alvará para Google Workspace e Microsoft 365',
                'Importação da lista de estudantes e professores via CSV',
            ],
        }, status=status.HTTP_201_CREATED)


class CloudIntegrationViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """
    Gestão das credenciais encriptadas e estado de sincronização cloud, isolada por escola.
    """
    queryset = CloudIntegration.objects.all()
    serializer_class = CloudIntegrationSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    filterset_fields = ['school', 'provider', 'sync_enabled', 'sync_status']


class TLSDomainCheckAPIView(APIView):
    """
    Endpoint interno consultado pelo Caddy `on_demand_tls` (`ask`) antes de emitir
    certificados SSL/TLS automáticos para domínios `.edu.ao` ou da plataforma.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        domain = (request.query_params.get('domain') or '').strip().lower().rstrip('.')
        if not domain or len(domain) > 253 or ' ' in domain:
            return Response({'allowed': False, 'reason': 'Domínio inválido.'}, status=status.HTTP_403_FORBIDDEN)

        platform_domains = set(getattr(settings, 'EDULINK_PLATFORM_DOMAINS', []))
        if domain in platform_domains:
            return Response({'allowed': True, 'domain': domain, 'kind': 'platform'})

        is_active_school = School.objects.filter(domain=domain, is_active=True).exists()
        if not is_active_school and domain.startswith('www.'):
            is_active_school = School.objects.filter(domain=domain[4:], is_active=True).exists()

        if is_active_school:
            return Response({'allowed': True, 'domain': domain, 'kind': 'school'})

        return Response({'allowed': False, 'domain': domain}, status=status.HTTP_403_FORBIDDEN)
