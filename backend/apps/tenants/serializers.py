from django.utils.text import slugify
from rest_framework import serializers

from .models import (
    RESERVED_PREVIEW_SLUGS,
    CloudIntegration,
    OnboardingDocument,
    School,
    domain_validator,
)


class OnboardingDocumentSerializer(serializers.ModelSerializer):
    """Upload e listagem dos comprovativos legais exigidos para DNS.AO, Google, Microsoft e APD."""

    doc_type_label = serializers.CharField(source='get_doc_type_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = OnboardingDocument
        fields = [
            'id',
            'school',
            'doc_type',
            'doc_type_label',
            'file',
            'status',
            'status_label',
            'review_notes',
            'verified_at',
            'verified_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'school',
            'status',
            'review_notes',
            'verified_at',
            'verified_by',
            'created_at',
            'updated_at',
        ]

    def validate_file(self, value):
        max_size_bytes = 10 * 1024 * 1024  # 10 MB
        if value.size > max_size_bytes:
            raise serializers.ValidationError('O ficheiro excede o limite máximo de 10 MB.')
        return value


class OnboardingDocumentReviewSerializer(serializers.ModelSerializer):
    """Usado exclusivamente pela equipa EduLink (PLATFORM_ADMIN) para aprovar ou rejeitar documentos."""

    class Meta:
        model = OnboardingDocument
        fields = ['status', 'review_notes']

    def validate_status(self, value):
        if value not in OnboardingDocument.ReviewStatus.values:
            raise serializers.ValidationError('Estado de revisão inválido.')
        return value


class SchoolPublicSerializer(serializers.ModelSerializer):
    """
    Serializer público para o frontend Next.js renderizar o site institucional
    da escola ([domain] ou {preview_slug}.edulink.ao) e validar a acreditação.
    """

    effective_site_host = serializers.CharField(read_only=True)
    is_canva_k12_eligible = serializers.BooleanField(read_only=True)

    class Meta:
        model = School
        fields = [
            'id',
            'name',
            'institution_type',
            'preview_slug',
            'domain',
            'effective_site_host',
            'is_canva_k12_eligible',
            'alvara_med_mescti',
            'primary_color',
            'logo_url',
            'contact_email',
            'phone',
            'province',
            'municipality',
            'address',
            'about_text',
            'apd_notified',
            'apd_dossier_number',
            'is_active',
        ]


class SchoolSerializer(serializers.ModelSerializer):
    """Serializer administrativo com métricas operacionais, estado do dossiê e feature flags."""

    effective_site_host = serializers.CharField(read_only=True)
    is_canva_k12_eligible = serializers.BooleanField(read_only=True)
    total_students = serializers.SerializerMethodField()
    total_teachers = serializers.SerializerMethodField()
    active_integrations = serializers.SerializerMethodField()
    onboarding_documents = OnboardingDocumentSerializer(many=True, read_only=True)
    documents_uploaded_count = serializers.SerializerMethodField()
    documents_approved_count = serializers.SerializerMethodField()

    class Meta:
        model = School
        fields = '__all__'

    def get_total_students(self, obj):
        return obj.academic_users.filter(role='STUDENT').count()

    def get_total_teachers(self, obj):
        return obj.academic_users.filter(role='TEACHER').count()

    def get_active_integrations(self, obj):
        return [ci.provider for ci in obj.cloud_integrations.all() if ci.sync_enabled]

    def get_documents_uploaded_count(self, obj):
        return len(obj.onboarding_documents.all())

    def get_documents_approved_count(self, obj):
        return sum(
            1
            for doc in obj.onboarding_documents.all()
            if doc.status == OnboardingDocument.ReviewStatus.APPROVED
        )


class SchoolOnboardSerializer(serializers.ModelSerializer):
    """
    Serializer do Wizard de Onboarding em 4 passos.
    Permite criação imediata em modo demonstração ({preview_slug}.edulink.ao) com domínio opcional.
    """

    domain = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    preview_slug = serializers.CharField(required=False, allow_blank=True)
    logo_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = School
        fields = [
            'name',
            'institution_type',
            'nif',
            'alvara_med_mescti',
            'preview_slug',
            'domain',
            'primary_color',
            'logo_url',
            'director_external_email',
            'contact_email',
            'phone',
            'province',
            'municipality',
            'address',
            'about_text',
        ]

    def validate_domain(self, value):
        cleaned = School.normalize_host(value)
        if not cleaned:
            return None
        # Se a secretaria introduzir apenas o nome curto sem extensão, assume .edu.ao
        if '.' not in cleaned:
            cleaned = f'{cleaned}.edu.ao'
        domain_validator(cleaned)
        if School.objects.filter(domain=cleaned).exists():
            raise serializers.ValidationError('Já existe uma instituição registada com este domínio.')
        return cleaned

    def validate_preview_slug(self, value):
        cleaned = slugify((value or '').strip())[:63].strip('-')
        if not cleaned:
            return ''
        if cleaned in RESERVED_PREVIEW_SLUGS:
            raise serializers.ValidationError(
                f'O subdomínio "{cleaned}" é reservado pela infraestrutura EduLink.'
            )
        if School.objects.filter(preview_slug=cleaned).exists():
            raise serializers.ValidationError('Este endereço de demonstração já está a ser utilizado.')
        return cleaned

    def validate_logo_url(self, value):
        return value or None


class CloudIntegrationSerializer(serializers.ModelSerializer):
    credentials_payload = serializers.JSONField(
        write_only=True,
        required=False,
        help_text='JSON da Service Account (Google) ou credenciais App Registration (Microsoft)',
    )
    has_valid_credentials = serializers.BooleanField(read_only=True)

    class Meta:
        model = CloudIntegration
        fields = [
            'id',
            'school',
            'provider',
            'sync_enabled',
            'sync_status',
            'has_valid_credentials',
            'last_sync_at',
            'last_error_message',
            'credentials_payload',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['sync_status', 'has_valid_credentials', 'last_sync_at', 'last_error_message']

    def create(self, validated_data):
        credentials_payload = validated_data.pop('credentials_payload', None)
        instance = CloudIntegration(**validated_data)
        if credentials_payload:
            instance.set_credentials(credentials_payload)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        credentials_payload = validated_data.pop('credentials_payload', None)
        if credentials_payload:
            instance.set_credentials(credentials_payload)
        return super().update(instance, validated_data)