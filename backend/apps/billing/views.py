from datetime import date
from decimal import Decimal

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.benefits.models import BenefitOffer
from apps.billing.models import (
    AGTInvoice,
    KwanzaPayment,
    PLAN_CATALOG,
    SchoolSubscription,
)
from apps.billing.serializers import (
    AGTInvoiceSerializer,
    KwanzaPaymentSerializer,
    SchoolSubscriptionSerializer,
)
from apps.billing.services.agt_invoicing import (
    build_saft_export,
    build_saft_xml,
    render_agt_invoice_html,
)
from apps.billing.services.payments_gateway import (
    confirm_kwanza_payment,
    initiate_kwanza_payment,
    verify_gateway_signature,
)
from apps.core.permissions import (
    IsPlatformAdmin,
    IsPlatformAdminOrSchoolSecretary,
    TenantScopedMixin,
    get_user_profile,
    is_platform_admin,
)


def _parse_iso_date(raw_value: str | None, field_name: str) -> date | None:
    if not raw_value:
        return None
    try:
        return date.fromisoformat(raw_value.strip())
    except ValueError as exc:
        raise ValidationError({field_name: 'Formato de data inválido. Use AAAA-MM-DD.'}) from exc


def _apply_admin_school_filter(qs, request):
    """Permite ao PLATFORM_ADMIN filtrar explicitamente por ?school=<uuid> sem quebrar paginação."""
    school_id = (request.query_params.get('school') or '').strip()
    if school_id and is_platform_admin(request.user):
        return qs.filter(school_id=school_id)
    return qs


class PlanCatalogAPIView(APIView):
    """Lista os planos comerciais em Kwanzas da plataforma EduLink."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        plans = [
            {
                'code': code,
                'label': info['label'],
                'billing_type': 'ONE_TIME' if code == SchoolSubscription.PlanCode.SETUP_DIGITAL else 'ANNUAL',
                'price_aoa': f"{info['price_aoa']:.2f}",
                'duration_days': info['duration_days'],
                'max_users': info['max_users'],
            }
            for code, info in PLAN_CATALOG.items()
        ]
        return Response(plans)


def _resolve_authorized_school(user, requested_school):
    """Valida e resolve a escola autorizada para escrita por admin ou secretaria."""
    if is_platform_admin(user):
        if not requested_school:
            raise ValidationError({'school': 'Indique a escola para esta operação.'})
        return requested_school
    profile = get_user_profile(user)
    if not profile or not profile.school_id:
        raise PermissionDenied('A sua conta de secretaria ainda não está associada a nenhuma escola.')
    if requested_school and str(requested_school.id) != str(profile.school_id):
        raise PermissionDenied('Não tem permissão para operar noutra escola.')
    return profile.school


class SchoolSubscriptionViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """Gestão de subscrições comerciais por escola (Secretaria contrata; Admin gere estados)."""

    queryset = SchoolSubscription.objects.select_related('school').all()
    serializer_class = SchoolSubscriptionSerializer
    filterset_fields = ['school', 'plan_code', 'status']

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsPlatformAdmin()]
        return [IsPlatformAdminOrSchoolSecretary()]

    def get_queryset(self):
        return _apply_admin_school_filter(super().get_queryset(), self.request)

    def perform_create(self, serializer):
        school = _resolve_authorized_school(
            self.request.user,
            serializer.validated_data.get('school'),
        )
        plan_code = serializer.validated_data.get('plan_code', SchoolSubscription.PlanCode.ESSENCIAL)
        price_aoa = SchoolSubscription.default_price_for(plan_code)
        serializer.save(school=school, annual_price_aoa=price_aoa)


class KwanzaPaymentViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """
    Iniciação e consulta de pagamentos em Kwanzas (Multicaixa Express / KWiK / IBAN).
    Secretarias e Admin gerem pagamentos da escola; estudantes gerem os seus pacotes B2B2C.
    """

    queryset = KwanzaPayment.objects.select_related(
        'school',
        'subscription',
        'academic_user',
        'benefit_offer',
        'agt_invoice',
    ).all()
    serializer_class = KwanzaPaymentSerializer
    http_method_names = ['get', 'post', 'head', 'options']
    filterset_fields = ['school', 'subscription', 'payment_method', 'status']

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if is_platform_admin(user):
            return _apply_admin_school_filter(qs, self.request)
        profile = get_user_profile(user)
        if profile and profile.role == 'SCHOOL_SECRETARY' and profile.school_id:
            return qs.filter(school_id=profile.school_id)
        if profile and profile.academic_user_id:
            return qs.filter(academic_user_id=profile.academic_user_id)
        return qs.none()

    def create(self, request, *args, **kwargs):
        method = request.data.get('payment_method', KwanzaPayment.Method.MULTICAIXA_EXPRESS)
        if method not in KwanzaPayment.Method.values:
            raise ValidationError({'payment_method': 'Método de pagamento inválido.'})

        customer_phone = (request.data.get('customer_phone') or '').strip()
        subscription_id = request.data.get('subscription')
        benefit_offer_id = request.data.get('benefit_offer')

        if subscription_id:
            if not IsPlatformAdminOrSchoolSecretary().has_permission(request, self):
                raise PermissionDenied('Apenas secretaria ou admin pode iniciar pagamento de subscrição escolar.')
            sub = SchoolSubscription.objects.select_related('school').filter(id=subscription_id).first()
            if not sub:
                return Response({'detail': 'Subscrição não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
            _resolve_authorized_school(request.user, sub.school)
            payment = initiate_kwanza_payment(
                amount_aoa=sub.annual_price_aoa,
                payment_method=method,
                description=f"Subscrição {sub.get_plan_code_display()} — {sub.school.name}",
                school=sub.school,
                subscription=sub,
                customer_phone=customer_phone,
                customer_name=sub.school.name,
                customer_nif=sub.school.nif,
            )
            return Response(self.get_serializer(payment).data, status=status.HTTP_201_CREATED)

        if benefit_offer_id:
            offer = BenefitOffer.objects.select_related('partner').filter(
                id=benefit_offer_id,
                is_active=True,
                partner__is_active=True,
            ).first()
            if not offer or offer.price_aoa <= Decimal('0.00'):
                raise ValidationError({'benefit_offer': 'Oferta paga inválida ou inexistente.'})
            profile = get_user_profile(request.user)
            academic_user = profile.academic_user if profile else None
            if not academic_user:
                raise PermissionDenied('Apenas titulares académicos podem adquirir pacotes do Clube de Benefícios.')
            if not academic_user.is_active or not academic_user.school.is_active:
                raise PermissionDenied('A sua matrícula encontra-se suspensa ou inativa.')

            payment = initiate_kwanza_payment(
                amount_aoa=offer.price_aoa,
                payment_method=method,
                description=f"{offer.partner.name}: {offer.title}",
                school=academic_user.school,
                academic_user=academic_user,
                benefit_offer=offer,
                customer_phone=customer_phone,
                customer_name=academic_user.full_name,
                customer_nif='999999999',
            )
            return Response(self.get_serializer(payment).data, status=status.HTTP_201_CREATED)

        raise ValidationError({'detail': 'Indique subscription ou benefit_offer para iniciar o pagamento.'})

    @action(detail=True, methods=['post'], url_path='sandbox-confirm')
    def sandbox_confirm(self, request, pk=None):
        """Confirmação manual / sandbox exclusiva do Administrador da Plataforma (fail-closed em produção)."""
        if not getattr(settings, 'KWANZA_SANDBOX_ENABLED', False):
            raise PermissionDenied('Confirmação sandbox desativada neste ambiente.')
        if not IsPlatformAdmin().has_permission(request, self):
            raise PermissionDenied('Apenas o Administrador da Plataforma pode confirmar pagamentos manualmente / em sandbox.')

        payment = self.get_object()
        confirmed_payment, invoice = confirm_kwanza_payment(
            payment,
            webhook_payload={'source': 'sandbox_manual_confirm', 'actor': request.user.username},
        )
        return Response({
            'payment': self.get_serializer(confirmed_payment).data,
            'invoice': AGTInvoiceSerializer(invoice).data,
        })


class KwanzaWebhookAPIView(APIView):
    """
    Webhook autenticado por HMAC-SHA256 (X-Kwanza-Signature) para notificações
    Multicaixa Express / KWiK.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        sig = request.META.get('HTTP_X_KWANZA_SIGNATURE', '')
        if not verify_gateway_signature(request.body, sig):
            return Response({'detail': 'Assinatura HMAC inválida.'}, status=status.HTTP_401_UNAUTHORIZED)

        reference = (request.data.get('reference') or '').strip()
        event_status = (request.data.get('status') or 'CONFIRMED').upper()
        tx_id = (request.data.get('transaction_id') or '').strip()

        payment = KwanzaPayment.objects.filter(reference=reference).first()
        if not payment:
            return Response({'detail': 'Referência de pagamento não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        if event_status == 'CONFIRMED':
            confirmed_payment, invoice = confirm_kwanza_payment(
                payment,
                gateway_transaction_id=tx_id,
                webhook_payload=dict(request.data),
            )
            return Response({
                'status': 'confirmed',
                'payment_reference': confirmed_payment.reference,
                'invoice_number': invoice.invoice_number,
            })

        if event_status in (KwanzaPayment.Status.FAILED, KwanzaPayment.Status.EXPIRED):
            payment.status = event_status
            payment.webhook_payload = dict(request.data)
            payment.save(update_fields=['status', 'webhook_payload', 'updated_at'])
            return Response({'status': payment.status.lower()})

        return Response({'detail': 'Estado de webhook não suportado.'}, status=status.HTTP_400_BAD_REQUEST)


class AGTInvoiceViewSet(TenantScopedMixin, viewsets.ReadOnlyModelViewSet):
    """Consulta, visualização HTML imprimível e exportação SAF-T (AO) de Faturas AGT."""

    queryset = AGTInvoice.objects.select_related('school', 'payment').all()
    serializer_class = AGTInvoiceSerializer
    filterset_fields = ['school', 'series']

    def get_permissions(self):
        if self.action == 'saft_export':
            # Ficheiro fiscal SAF-T (AO) pertence à contabilidade global da EduLink perante a AGT
            return [IsPlatformAdmin()]
        return [IsPlatformAdminOrSchoolSecretary()]

    def get_queryset(self):
        return _apply_admin_school_filter(super().get_queryset(), self.request)

    @action(detail=True, methods=['get'], url_path='html')
    def html_view(self, request, pk=None):
        invoice = self.get_object()
        return HttpResponse(render_agt_invoice_html(invoice), content_type='text/html; charset=utf-8')

    @action(detail=False, methods=['get'], url_path='saft-export')
    def saft_export(self, request):
        export_format = (request.query_params.get('export_format') or 'json').strip().lower()
        start_date = _parse_iso_date(request.query_params.get('start_date'), 'start_date')
        end_date = _parse_iso_date(request.query_params.get('end_date'), 'end_date')
        school_id = (request.query_params.get('school') or '').strip()

        school = None
        if school_id:
            from apps.tenants.models import School
            school = School.objects.filter(id=school_id).first()

        if export_format == 'xml':
            xml_content = build_saft_xml(school=school, start_date=start_date, end_date=end_date)
            filename = f"saft-ao-edulink-{timezone.localdate().isoformat()}.xml"
            response = HttpResponse(xml_content, content_type='application/xml; charset=utf-8')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

        return Response(build_saft_export(school=school))