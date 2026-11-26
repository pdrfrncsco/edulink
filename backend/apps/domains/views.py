from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.permissions import IsPlatformAdminOrSchoolSecretary, TenantScopedMixin
from .models import DNSRecord, DomainConfiguration
from .serializers import DNSRecordSerializer, DomainConfigurationSerializer
from .services.blueprint import generate_dns_blueprint
from .services.cloudflare_service import CloudflareDNSService, CloudflareError
from .services.dns_checker import build_dns_ao_dossier, check_domain_propagation
from .tasks import provision_school_dns_task


class DomainConfigurationViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """
    Gestão da configuração DNS (.edu.ao), geração automática de registos
    e sincronização com a Cloudflare, isolada por escola.
    """
    queryset = DomainConfiguration.objects.select_related('school').prefetch_related('records').all()
    serializer_class = DomainConfigurationSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    filterset_fields = ['school', 'registrar_status']
    search_fields = ['school__domain', 'school__name']

    @action(detail=True, methods=['post'], url_path='generate-blueprint')
    def generate_blueprint(self, request, pk=None):
        domain_config = self.get_object()
        providers = request.data.get('providers')
        if isinstance(providers, str):
            providers = [p.strip().upper() for p in providers.split(',') if p.strip()]

        records = generate_dns_blueprint(domain_config, providers=providers)
        serializer = DNSRecordSerializer(records, many=True)
        return Response({
            'domain': domain_config.school.domain,
            'records_count': len(records),
            'records': serializer.data,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='sync-cloudflare')
    def sync_cloudflare(self, request, pk=None):
        domain_config = self.get_object()
        run_async = str(request.query_params.get('async', 'false')).lower() == 'true'

        if run_async:
            task = provision_school_dns_task.delay(str(domain_config.id))
            return Response({
                'message': f'Sincronização DNS iniciada para {domain_config.school.domain}.',
                'task_id': str(task.id),
            }, status=status.HTTP_202_ACCEPTED)

        if not domain_config.records.exists():
            generate_dns_blueprint(domain_config)

        service = CloudflareDNSService.for_domain_config(domain_config)
        try:
            result = service.sync_domain_configuration(domain_config)
            return Response({'ok': True, 'domain': domain_config.school.domain, **result})
        except CloudflareError as exc:
            domain_config.registrar_status = DomainConfiguration.RegistrarStatus.ERROR
            domain_config.last_error = str(exc)
            domain_config.save(update_fields=['registrar_status', 'last_error'])
            return Response(
                {'ok': False, 'error': str(exc), 'retryable': exc.retryable},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['post'], url_path='verify-propagation')
    def verify_propagation(self, request, pk=None):
        domain_config = self.get_object()
        report = check_domain_propagation(domain_config)
        return Response(report, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='dns-ao-dossier')
    def dns_ao_dossier(self, request, pk=None):
        domain_config = self.get_object()
        return Response(build_dns_ao_dossier(domain_config), status=status.HTTP_200_OK)


class DNSRecordViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """CRUD dos registos DNS individuais da zona da escola."""
    queryset = DNSRecord.objects.select_related('domain_config', 'domain_config__school').all()
    serializer_class = DNSRecordSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    tenant_lookup_field = 'domain_config__school_id'
    tenant_serializer_field = 'domain_config'
    filterset_fields = ['domain_config', 'record_type', 'purpose', 'sync_state', 'propagated']
    search_fields = ['name', 'content', 'domain_config__school__domain']
