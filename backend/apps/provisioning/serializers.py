from rest_framework import serializers
from .models import ProvisioningLog


class ProvisioningLogSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    institutional_email = serializers.ReadOnlyField(source='user.institutional_email')

    class Meta:
        model = ProvisioningLog
        fields = [
            'id',
            'school',
            'school_name',
            'user',
            'institutional_email',
            'provider',
            'action',
            'status',
            'external_id',
            'detail',
            'created_at',
        ]
