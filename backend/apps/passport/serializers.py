from rest_framework import serializers

from apps.core.permissions import get_user_profile, is_platform_admin
from .models import GlobalVerifierApplication

SUBMISSION_STATUSES = {'SUBMITTED', 'IN_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'VERIFIED'}


class GlobalVerifierApplicationSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    school_domain = serializers.ReadOnlyField(source='school.domain')
    school_effective_host = serializers.ReadOnlyField(source='school.effective_site_host')
    school_institution_type = serializers.ReadOnlyField(source='school.institution_type')
    has_official_domain = serializers.SerializerMethodField()
    verifier_label = serializers.CharField(source='get_verifier_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = GlobalVerifierApplication
        fields = [
            'id',
            'school',
            'school_name',
            'school_domain',
            'school_effective_host',
            'school_institution_type',
            'has_official_domain',
            'verifier',
            'verifier_label',
            'status',
            'status_label',
            'official_website_url',
            'submission_reference',
            'readiness_snapshot',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'readiness_snapshot', 'created_at', 'updated_at']

    def get_has_official_domain(self, obj) -> bool:
        return bool(obj.school and obj.school.domain)

    def validate_school(self, school):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return school

        if is_platform_admin(request.user):
            return school

        profile = get_user_profile(request.user)
        if not profile or not profile.school_id:
            raise serializers.ValidationError('A sua conta de secretaria não possui instituição associada.')
        if str(school.id) != str(profile.school_id):
            raise serializers.ValidationError('Não tem permissão para gerir candidaturas de outra escola.')
        return school

    def validate_official_website_url(self, value: str) -> str:
        cleaned = (value or '').strip()
        if cleaned and not cleaned.startswith(('http://', 'https://')):
            cleaned = f'https://{cleaned}'
        return cleaned

    def validate(self, attrs):
        school = attrs.get('school') or (self.instance.school if self.instance else None)
        target_status = attrs.get('status') or (self.instance.status if self.instance else None)
        request = self.context.get('request')

        # Secretarias não podem forçar aprovação final manualmente; apenas PLATFORM_ADMIN
        if (
            request
            and request.user
            and request.user.is_authenticated
            and not is_platform_admin(request.user)
            and 'status' in attrs
            and str(attrs['status']).upper() in {'APPROVED', 'VERIFIED'}
        ):
            raise serializers.ValidationError({
                'status': 'Apenas a equipa operacional EduLink pode marcar a candidatura como aprovada.'
            })

        # Verificadores globais (SheerID/UNiDAYS/GitHub) exigem domínio próprio, nunca subdomínio SaaS
        if (
            school
            and target_status
            and str(target_status).upper() in SUBMISSION_STATUSES
            and not school.domain
        ):
            raise serializers.ValidationError({
                'status': (
                    'Esta instituição ainda está em modo demonstração (.edulink.ao). '
                    'Configure o domínio próprio (.edu.ao) antes de submeter a candidatura ao verificador global.'
                )
            })

        return attrs