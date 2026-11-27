from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import (
    IsPlatformAdmin,
    IsPlatformAdminOrSchoolSecretary,
    TenantScopedMixin,
    get_user_profile,
    is_platform_admin,
)
from .models import CloudIntegration, OnboardingDocument, School
from .serializers import (
    CloudIntegrationSerializer,
    OnboardingDocumentReviewSerializer,
    OnboardingDocumentSerializer,
    SchoolOnboardSerializer,
    SchoolPublicSerializer,
    SchoolSerializer,
)


def _get_authorized_school_or_403(request, school_id) -> School:
    """Garante isolamento estrito de tenant para operações em sub-recursos de uma escola."""
    school = get_object_or_404(School, id=school_id)
    if is_platform_admin(request.user):
        return school
    profile = get_user_profile(request.user)
    if not profile or str(profile.school_id) != str(school.id):
        raise PermissionDenied('Não tem permissão para aceder aos dados desta instituição.')
    return school


class SchoolViewSet(viewsets.ModelViewSet):
    """
    CRUD das instituições de ensino (Tenants).
    Administradores veem todas; Secretarias veem apenas a sua escola.
    """

    queryset = School.objects.prefetch_related('onboarding_documents', 'cloud_integrations')
    serializer_class = SchoolSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    search_fields = ['name', 'domain', 'preview_slug', 'nif', 'alvara_med_mescti']
    filterset_fields = [
        'is_active',
        'institution_type',
        'province',
        'apd_notified',
        'dns_status',
        'google_status',
        'microsoft_status',
        'canva_status',
    ]

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

    def get_permissions(self):
        if self.action in ('toggle_active', 'destroy'):
            return [IsPlatformAdmin()]
        return [IsPlatformAdminOrSchoolSecretary()]

    def perform_update(self, serializer):
        if is_platform_admin(self.request.user):
            serializer.save()
            return
        # Secretarias não podem alterar ativação global, selo APD, pipeline externo nem feature flags
        inst = serializer.instance
        serializer.save(
            is_active=inst.is_active,
            apd_notified=inst.apd_notified,
            apd_dossier_number=inst.apd_dossier_number,
            dns_status=inst.dns_status,
            google_status=inst.google_status,
            microsoft_status=inst.microsoft_status,
            canva_status=inst.canva_status,
            enable_erp_sync=inst.enable_erp_sync,
            enable_benefits_club=inst.enable_benefits_club,
            enable_online_payments=inst.enable_online_payments,
        )

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        school = self.get_object()
        school.is_active = not school.is_active
        school.save(update_fields=['is_active', 'updated_at'])
        return Response({
            'status': 'updated',
            'is_active': school.is_active,
            'message': f"A instituição {school.name} está agora {'ativa' if school.is_active else 'inativa'}.",
        })


class SchoolPublicDetailView(generics.RetrieveAPIView):
    """
    Endpoint público consumido pelo Next.js para renderizar tanto domínios oficiais
    (.edu.ao / próprios) quanto subdomínios de demonstração ({slug}.edulink.ao).
    """

    permission_classes = [AllowAny]
    serializer_class = SchoolPublicSerializer

    def get_object(self):
        domain = self.request.query_params.get('domain', '')
        return School.resolve_by_host(domain, allow_bare_slug=True)

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
    Endpoint do Wizard de Onboarding para adesão de uma nova instituição.
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

        next_steps = []
        if not school.domain:
            next_steps.append(
                f'Validar a pré-visualização em https://{school.effective_site_host} e submeter pedido de domínio .edu.ao no DNS.AO'
            )
        else:
            next_steps.append(f'Configurar registos DNS (TXT, MX, SPF, DKIM, DMARC) para {school.domain}')

        next_steps.extend([
            'Anexar/validar Alvará MED/MESCTI, NIF, BI do diretor e Mandato Técnico',
            'Submeter acreditação ao Google Workspace for Education e Microsoft 365 (A1)',
            'Ativar Canva para Educação gratuito via SSO (K-12)'
            if school.is_canva_k12_eligible
            else 'Registar instituição na SheerID, UNiDAYS e GitHub Education (Ensino Superior)',
            'Importar a lista de estudantes e docentes via CSV e gerar dossiê APD',
        ])

        return Response({
            'message': 'Instituição registada com sucesso na EduLink.',
            'school_id': str(school.id),
            'domain': school.domain,
            'preview_slug': school.preview_slug,
            'effective_site_host': school.effective_site_host,
            'institution_type': school.institution_type,
            'is_canva_k12_eligible': school.is_canva_k12_eligible,
            'next_steps': next_steps,
        }, status=status.HTTP_201_CREATED)


class SchoolOnboardingDocumentListCreateView(APIView):
    """
    Lista e carrega (upsert por doc_type) os comprovativos legais de onboarding de uma escola.
    Rota esperada pelo OnboardingTab.tsx: /api/v1/tenants/<school_id>/documents/
    """

    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, school_id):
        school = _get_authorized_school_or_403(request, school_id)
        docs = school.onboarding_documents.all()
        serializer = OnboardingDocumentSerializer(docs, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, school_id):
        school = _get_authorized_school_or_403(request, school_id)
        serializer = OnboardingDocumentSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        doc_type = serializer.validated_data['doc_type']
        uploaded_file = serializer.validated_data['file']

        existing = OnboardingDocument.objects.filter(school=school, doc_type=doc_type).first()
        if existing:
            # Remove ficheiro anterior do storage ao substituir o comprovativo
            if existing.file:
                existing.file.delete(save=False)
            existing.file = uploaded_file
            existing.status = OnboardingDocument.ReviewStatus.PENDING
            existing.review_notes = ''
            existing.verified_at = None
            existing.verified_by = None
            existing.save()
            doc = existing
            http_status = status.HTTP_200_OK
        else:
            doc = OnboardingDocument.objects.create(
                school=school,
                doc_type=doc_type,
                file=uploaded_file,
            )
            http_status = status.HTTP_201_CREATED

        output = OnboardingDocumentSerializer(doc, context={'request': request})
        return Response(output.data, status=http_status)


class SchoolOnboardingDocumentReviewView(APIView):
    """
    Permite à equipa operacional EduLink (PLATFORM_ADMIN) aprovar ou rejeitar
    documentos carregados no dossiê de onboarding.
    """

    permission_classes = [IsPlatformAdmin]

    def post(self, request, school_id, doc_id):
        doc = get_object_or_404(OnboardingDocument, id=doc_id, school_id=school_id)
        serializer = OnboardingDocumentReviewSerializer(doc, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status', doc.status)
        doc.status = new_status
        if 'review_notes' in serializer.validated_data:
            doc.review_notes = serializer.validated_data['review_notes']

        if new_status == OnboardingDocument.ReviewStatus.APPROVED:
            doc.verified_at = timezone.now()
            doc.verified_by = request.user
        else:
            doc.verified_at = None
            doc.verified_by = None

        doc.save()
        output = OnboardingDocumentSerializer(doc, context={'request': request})
        return Response(output.data, status=status.HTTP_200_OK)


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
    certificados SSL/TLS automáticos para domínios da plataforma, domínios `.edu.ao`
    e subdomínios de demonstração `{preview_slug}.edulink.ao`.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        raw_domain = (request.query_params.get('domain') or '').strip().lower().rstrip('.')
        if not raw_domain or len(raw_domain) > 253 or ' ' in raw_domain:
            return Response({'allowed': False, 'reason': 'Domínio inválido.'}, status=status.HTTP_403_FORBIDDEN)

        platform_domains = {
            d.strip().lower().rstrip('.')
            for d in getattr(settings, 'EDULINK_PLATFORM_DOMAINS', [])
            if d
        }
        normalized = School.normalize_host(raw_domain)
        if raw_domain in platform_domains or (normalized and normalized in platform_domains):
            return Response({'allowed': True, 'domain': raw_domain, 'kind': 'platform'})

        school = School.resolve_by_host(raw_domain)
        if school:
            kind = 'school_domain' if school.domain and normalized == school.domain else 'school_preview'
            return Response({
                'allowed': True,
                'domain': raw_domain,
                'school_id': str(school.id),
                'kind': kind,
            })

        return Response({'allowed': False, 'domain': raw_domain}, status=status.HTTP_403_FORBIDDEN)