from rest_framework import serializers
from .models import School, CloudIntegration


class SchoolPublicSerializer(serializers.ModelSerializer):
    """
    Serializer público para consumo pelo frontend Next.js na renderização
    do site institucional da escola ([domain]) e verificação de acreditação.
    """
    class Meta:
        model = School
        fields = [
            'id',
            'name',
            'domain',
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
    """Serializer administrativo com métricas operacionais da escola."""
    total_students = serializers.SerializerMethodField()
    total_teachers = serializers.SerializerMethodField()
    active_integrations = serializers.SerializerMethodField()

    class Meta:
        model = School
        fields = '__all__'

    def get_total_students(self, obj):
        return obj.academic_users.filter(role='STUDENT').count()

    def get_total_teachers(self, obj):
        return obj.academic_users.filter(role='TEACHER').count()

    def get_active_integrations(self, obj):
        return list(obj.cloud_integrations.filter(sync_enabled=True).values_list('provider', flat=True))


class SchoolOnboardSerializer(serializers.ModelSerializer):
    """Serializer para registo inicial e onboarding rápido da escola."""
    class Meta:
        model = School
        fields = [
            'name',
            'nif',
            'alvara_med_mescti',
            'domain',
            'primary_color',
            'contact_email',
            'phone',
            'province',
            'municipality',
            'address',
            'about_text',
        ]

    def validate_domain(self, value):
        value = value.strip().lower()
        if not (value.endswith('.edu.ao') or value.endswith('.localhost')):
            value = f"{value}.edu.ao"
        return value


class CloudIntegrationSerializer(serializers.ModelSerializer):
    credentials_payload = serializers.JSONField(
        write_only=True,
        required=False,
        help_text="JSON da Service Account ou credenciais da aplicação"
    )

    class Meta:
        model = CloudIntegration
        fields = [
            'id',
            'school',
            'provider',
            'sync_enabled',
            'sync_status',
            'last_sync_at',
            'last_error_message',
            'credentials_payload',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['sync_status', 'last_sync_at', 'last_error_message']

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
