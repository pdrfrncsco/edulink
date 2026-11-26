from rest_framework import serializers
from .models import APDDossier, ParentalConsent


class APDDossierSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    school_domain = serializers.ReadOnlyField(source='school.domain')

    class Meta:
        model = APDDossier
        fields = [
            'id',
            'school',
            'school_name',
            'school_domain',
            'director_full_name',
            'director_bi',
            'dpo_name',
            'dpo_email',
            'institution_type',
            'has_minors',
            'international_transfer_providers',
            'data_categories',
            'retention_years',
            'submission_type',
            'status',
            'apd_reference_number',
            'submitted_at',
            'generated_payload',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['submission_type', 'submitted_at', 'generated_payload']


class ParentalConsentSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    student_name = serializers.ReadOnlyField(source='student.full_name')
    student_email = serializers.ReadOnlyField(source='student.institutional_email')

    class Meta:
        model = ParentalConsent
        fields = [
            'id',
            'school',
            'school_name',
            'student',
            'student_name',
            'student_email',
            'guardian_full_name',
            'guardian_bi',
            'guardian_relationship',
            'guardian_phone',
            'guardian_email',
            'is_minor',
            'consent_scope',
            'status',
            'consent_token',
            'signed_at',
            'revoked_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['consent_token', 'status', 'signed_at', 'revoked_at']


class SignParentalConsentSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=128)
    guardian_full_name = serializers.CharField(max_length=255)
    guardian_bi = serializers.CharField(max_length=40)
    guardian_relationship = serializers.ChoiceField(
        choices=ParentalConsent.Relationship.choices,
        default=ParentalConsent.Relationship.ENCARREGADO,
    )
    guardian_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    guardian_email = serializers.EmailField(required=False, allow_blank=True)
    consent_scope = serializers.JSONField(required=False)
