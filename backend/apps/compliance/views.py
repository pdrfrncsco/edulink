from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.notifications import send_parental_consent_email
from apps.core.permissions import (
    IsPlatformAdminOrSchoolSecretary,
    TenantScopedMixin,
    get_user_profile,
    is_platform_admin,
)
from apps.tenants.models import School
from .models import APDDossier, ParentalConsent
from .serializers import (
    APDDossierSerializer,
    ParentalConsentSerializer,
    SignParentalConsentSerializer,
)
from .services.apd_generator import (
    bulk_create_parental_consents,
    generate_and_save_apd_dossier,
    render_apd_dossier_html,
    render_parental_consent_html,
)
from .tasks import send_parental_consent_email_task


def _client_ip(request) -> str | None:
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class APDDossierViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """
    Gestão e geração automática do Dossiê de Notificação/Autorização à APD (Lei n.º 22/11),
    isolado por escola.
    """
    queryset = APDDossier.objects.select_related('school').all()
    serializer_class = APDDossierSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    filterset_fields = ['school', 'status', 'submission_type', 'has_minors']
    search_fields = ['school__name', 'school__domain', 'apd_reference_number', 'director_full_name']

    @action(detail=True, methods=['post'], url_path='generate')
    def generate(self, request, pk=None):
        dossier = self.get_object()
        payload = generate_and_save_apd_dossier(dossier)
        return Response({
            'id': str(dossier.id),
            'status': dossier.status,
            'submission_type': dossier.submission_type,
            'dossier': payload,
        })

    @action(detail=True, methods=['post'], url_path='mark-submitted')
    def mark_submitted(self, request, pk=None):
        dossier = self.get_object()
        ref_number = (request.data.get('apd_reference_number') or '').strip()
        if not ref_number:
            return Response(
                {'detail': 'O número de processo/registo APD (apd_reference_number) é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        approved = bool(request.data.get('approved', False))
        dossier.apd_reference_number = ref_number
        dossier.status = APDDossier.Status.APPROVED if approved else APDDossier.Status.SUBMITTED
        dossier.submitted_at = dossier.submitted_at or timezone.now()
        dossier.save(update_fields=['apd_reference_number', 'status', 'submitted_at'])

        school = dossier.school
        school.apd_notified = True
        school.apd_dossier_number = ref_number
        school.save(update_fields=['apd_notified', 'apd_dossier_number'])

        return Response({
            'message': 'Submissão à APD registada e sincronizada no perfil oficial da escola.',
            'school_id': str(school.id),
            'apd_notified': school.apd_notified,
            'apd_dossier_number': school.apd_dossier_number,
            'status': dossier.status,
        })

    @action(detail=True, methods=['get'], url_path='download-html')
    def download_html(self, request, pk=None):
        dossier = self.get_object()
        html = render_apd_dossier_html(dossier)
        response = HttpResponse(html, content_type='text/html; charset=utf-8')
        response['Content-Disposition'] = f'inline; filename="dossie-apd-{dossier.school.domain}.html"'
        return response


class ParentalConsentViewSet(TenantScopedMixin, viewsets.ModelViewSet):
    """
    Gestão de Termos de Consentimento Parental (menores de idade) exigidos pela APD.
    Apenas `by_token` e `sign` são públicos para o Encarregado de Educação.
    """
    queryset = ParentalConsent.objects.select_related('school', 'student').all()
    serializer_class = ParentalConsentSerializer
    permission_classes = [IsPlatformAdminOrSchoolSecretary]
    filterset_fields = ['school', 'student', 'status', 'is_minor']
    search_fields = ['student__full_name', 'student__institutional_email', 'guardian_full_name', 'guardian_bi']

    def get_permissions(self):
        if self.action in ('by_token', 'sign', 'download_by_token'):
            return [AllowAny()]
        return [IsPlatformAdminOrSchoolSecretary()]

    @action(detail=False, methods=['post'], url_path='bulk-generate')
    def bulk_generate(self, request):
        school_id = request.data.get('school_id')
        if not school_id:
            return Response({'detail': 'school_id é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        if not is_platform_admin(request.user):
            profile = get_user_profile(request.user)
            if not profile or not profile.school_id or str(profile.school_id) != str(school_id):
                raise PermissionDenied('Não tem permissão para gerar termos noutra escola.')

        school = School.objects.filter(id=school_id).first()
        if not school:
            return Response({'detail': 'Escola não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        summary = bulk_create_parental_consents(school)
        return Response({'school': school.name, **summary}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='by-token')
    def by_token(self, request):
        token = (request.query_params.get('token') or '').strip()
        consent = ParentalConsent.objects.select_related('school', 'student').filter(consent_token=token).first()
        if not consent:
            return Response({'detail': 'Termo de consentimento não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(self.get_serializer(consent).data)

    @action(detail=False, methods=['post'], url_path='sign')
    def sign(self, request):
        serializer = SignParentalConsentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        consent = ParentalConsent.objects.select_related('school', 'student').filter(
            consent_token=data['token']
        ).first()
        if not consent:
            return Response({'detail': 'Token de consentimento inválido.'}, status=status.HTTP_404_NOT_FOUND)

        consent.guardian_full_name = data['guardian_full_name']
        consent.guardian_bi = data['guardian_bi']
        consent.guardian_relationship = data['guardian_relationship']
        consent.guardian_phone = data.get('guardian_phone', '')
        consent.guardian_email = data.get('guardian_email', '')
        if data.get('consent_scope'):
            consent.consent_scope = data['consent_scope']
        consent.status = ParentalConsent.Status.SIGNED
        consent.signed_at = timezone.now()
        consent.revoked_at = None
        consent.signed_ip = _client_ip(request)
        consent.signed_user_agent = (request.META.get('HTTP_USER_AGENT') or '')[:255]
        consent.save()

        return Response({
            'message': 'Consentimento parental registado com sucesso.',
            'consent': self.get_serializer(consent).data,
        })

    @action(detail=True, methods=['post'], url_path='revoke')
    def revoke(self, request, pk=None):
        consent = self.get_object()
        consent.status = ParentalConsent.Status.REVOKED
        consent.revoked_at = timezone.now()
        consent.save(update_fields=['status', 'revoked_at'])
        return Response({'message': 'Consentimento revogado.', 'status': consent.status})

    @action(detail=True, methods=['get'], url_path='download-html')
    def download_html(self, request, pk=None):
        consent = self.get_object()
        html = render_parental_consent_html(consent)
        response = HttpResponse(html, content_type='text/html; charset=utf-8')
        response['Content-Disposition'] = f'inline; filename="consentimento-{consent.student.bi_or_student_id}.html"'
        return response

    @action(detail=False, methods=['get'], url_path='download-by-token')
    def download_by_token(self, request):
        token = (request.query_params.get('token') or '').strip()
        consent = ParentalConsent.objects.select_related('school', 'student').filter(consent_token=token).first()
        if not consent:
            return Response({'detail': 'Termo de consentimento não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        html = render_parental_consent_html(consent)
        response = HttpResponse(html, content_type='text/html; charset=utf-8')
        response['Content-Disposition'] = f'inline; filename="consentimento-{consent.student.bi_or_student_id}.html"'
        return response

    @action(detail=True, methods=['post'], url_path='send-email')
    def send_email(self, request, pk=None):
        """Envia o link do termo de consentimento parental para o e-mail do encarregado."""
        consent = self.get_object()
        recipient_email = (request.data.get('guardian_email') or '').strip()
        run_async = str(request.query_params.get('async', 'false')).lower() == 'true'

        if run_async:
            target = recipient_email or consent.guardian_email or consent.student.personal_email
            if not target:
                return Response(
                    {'detail': 'Indique um e-mail do Encarregado de Educação para enviar o termo.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            task = send_parental_consent_email_task.delay(str(consent.id), recipient_email)
            return Response({'status': 'queued', 'task_id': str(task.id), 'recipient': target}, status=status.HTTP_202_ACCEPTED)

        try:
            info = send_parental_consent_email(consent, recipient_email=recipient_email or None)
            return Response({'message': f"E-mail enviado para {info['recipient']}.", **info}, status=status.HTTP_200_OK)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='send-bulk-emails')
    def send_bulk_emails(self, request):
        """Envia em lote os termos pendentes que possuem e-mail de encarregado ou pessoal registado."""
        school_id = request.data.get('school_id')
        if not school_id:
            return Response({'detail': 'school_id é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

        if not is_platform_admin(request.user):
            profile = get_user_profile(request.user)
            if not profile or not profile.school_id or str(profile.school_id) != str(school_id):
                raise PermissionDenied('Não tem permissão para enviar termos noutra escola.')

        run_async = str(request.query_params.get('async', 'false')).lower() == 'true'
        pending = ParentalConsent.objects.select_related('school', 'student').filter(
            school_id=school_id,
            status=ParentalConsent.Status.PENDING,
        )
        sent = 0
        skipped = 0
        for consent in pending:
            target = (consent.guardian_email or '').strip() or (consent.student.personal_email or '').strip()
            if not target:
                skipped += 1
                continue
            if run_async:
                send_parental_consent_email_task.delay(str(consent.id), target)
            else:
                send_parental_consent_email(consent, recipient_email=target)
            sent += 1

        return Response({'sent': sent, 'skipped_without_email': skipped, 'async': run_async}, status=status.HTTP_200_OK)
