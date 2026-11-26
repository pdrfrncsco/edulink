from rest_framework import serializers
from .models import GlobalVerifierApplication


class GlobalVerifierApplicationSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    school_domain = serializers.ReadOnlyField(source='school.domain')

    class Meta:
        model = GlobalVerifierApplication
        fields = [
            'id',
            'school',
            'school_name',
            'school_domain',
            'verifier',
            'status',
            'official_website_url',
            'submission_reference',
            'readiness_snapshot',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['readiness_snapshot']
