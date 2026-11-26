import json
import secrets
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsPlatformAdminOrSchoolSecretary, TenantScopedMixin
from .models import ERPConnection, ERPSyncEvent
from .serializers import ERPConnectionSerializer, ERPSyncEventSerializer
from .services.adapters import ERPAdapterError, parse_erp_payload, verify_erp_signature
from .services.processor import process_erp_event
from .tasks import process_erp_webhook_event_task


class ERPConnectionViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """Gestão das ligações B2B2B com KLASSE, SysPortal e Kacennu isolada por escola."""
    queryset = ERPConnection.objects.select_related('school').all()
    serializer_class = ERPConnectionSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    filterset_fields = ['school', 'provider', 'is_active', 'last_sync_status']

    @action(detail=True, methods=['post'], url_path='reveal-secret')
    def reveal_secret(self, request, pk=None):
        conn = self.get_object()
        return Response({
            'id': str(conn.id),
            'provider': conn.provider,
            'webhook_secret': conn.get_webhook_secret(),
            'signature_header': 'X-EduLink-Signature',
        })

    @action(detail=True, methods=['post'], url_path='rotate-secret')
    def rotate_secret(self, request, pk=None):
        conn = self.get_object()
        new_secret = secrets.token_urlsafe(32)
        conn.set_webhook_secret(new_secret)
        conn.save(update_fields=['encrypted_webhook_secret'])
        return Response({
            'message': 'Segredo HMAC rodado com sucesso.',
            'webhook_secret': new_secret,
        })

    @action(detail=True, methods=['post'], url_path='simulate-event')
    def simulate_event(self, request, pk=None):
        """Permite à secretaria testar um evento do ERP sem configurar webhook externo."""
        conn = self.get_object()
        payload = request.data
        try:
            canonical = parse_erp_payload(conn.provider, payload)
        except ERPAdapterError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        event = ERPSyncEvent.objects.create(
            connection=conn,
            school=conn.school,
            provider=conn.provider,
            event_id=canonical.event_id,
            event_type=canonical.event_type,
            payload=payload,
        )
        processed = process_erp_event(event)
        return Response(ERPSyncEventSerializer(processed).data, status=status.HTTP_200_OK)


class ERPSyncEventViewSet(TenantScopedMixin, viewsets.ReadOnlyModelViewSet):
    """Histórico auditável de eventos de matrícula e propinas recebidos dos ERPs."""
    queryset = ERPSyncEvent.objects.select_related('school', 'connection', 'affected_user').all()
    serializer_class = ERPSyncEventSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    filterset_fields = ['school', 'connection', 'provider', 'event_type', 'processing_status']
    search_fields = ['event_id', 'affected_user__institutional_email', 'detail']


class ERPWebhookInboundAPIView(APIView):
    """
    Endpoint público para receção de webhooks assinados (HMAC-SHA256)
    provenientes dos ERPs locais angolanos (KLASSE, SysPortal, Kacennu).
    """
    permission_classes = [AllowAny]

    def post(self, request, provider: str, connection_id):
        provider_upper = provider.strip().upper()
        conn = ERPConnection.objects.select_related('school').filter(
            id=connection_id, provider=provider_upper
        ).first()
        if not conn:
            return Response({'detail': 'Ligação ERP não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if not conn.is_active:
            return Response({'detail': 'Ligação ERP desativada.'}, status=status.HTTP_403_FORBIDDEN)

        raw_body = request.body or b''
        signature = (
            request.META.get('HTTP_X_EDULINK_SIGNATURE')
            or request.META.get('HTTP_X_YETUEDU_SIGNATURE')
            or request.META.get('HTTP_X_SIGNATURE', '')
        )
        if not verify_erp_signature(conn.get_webhook_secret(), raw_body, signature):
            return Response({'detail': 'Assinatura HMAC inválida ou em falta.'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            payload = request.data if isinstance(request.data, dict) else json.loads(raw_body.decode('utf-8'))
            canonical = parse_erp_payload(conn.provider, payload)
        except Exception as exc:
            return Response({'detail': f'Payload inválido: {exc}'}, status=status.HTTP_400_BAD_REQUEST)

        if canonical.event_id:
            existing = ERPSyncEvent.objects.filter(
                connection=conn,
                event_id=canonical.event_id,
                processing_status=ERPSyncEvent.ProcessingStatus.PROCESSED,
            ).first()
            if existing:
                return Response({
                    'status': 'duplicate_ignored',
                    'event_id': canonical.event_id,
                    'sync_event_id': str(existing.id),
                }, status=status.HTTP_200_OK)

        event = ERPSyncEvent.objects.create(
            connection=conn,
            school=conn.school,
            provider=conn.provider,
            event_id=canonical.event_id,
            event_type=canonical.event_type,
            payload=payload,
        )

        run_sync = str(request.query_params.get('sync', 'false')).lower() == 'true'
        if run_sync:
            processed = process_erp_event(event)
            return Response(ERPSyncEventSerializer(processed).data, status=status.HTTP_200_OK)

        task = process_erp_webhook_event_task.delay(str(event.id))
        return Response({
            'status': 'accepted',
            'sync_event_id': str(event.id),
            'task_id': str(task.id),
        }, status=status.HTTP_202_ACCEPTED)
