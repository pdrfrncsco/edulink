from rest_framework import serializers
from .models import ERPConnection, ERPSyncEvent


class ERPConnectionSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    school_domain = serializers.ReadOnlyField(source='school.domain')
    webhook_path = serializers.SerializerMethodField()
    api_key = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = ERPConnection
        fields = [
            'id',
            'school',
            'school_name',
            'school_domain',
            'provider',
            'api_base_url',
            'api_key',
            'is_active',
            'webhook_path',
            'last_event_at',
            'last_sync_status',
            'last_error',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['last_event_at', 'last_sync_status', 'last_error']

    def get_webhook_path(self, obj):
        return f"/api/v1/erp-sync/webhook/{obj.provider.lower()}/{obj.id}/"

    def create(self, validated_data):
        api_key = validated_data.pop('api_key', '')
        instance = ERPConnection(**validated_data)
        if api_key:
            instance.set_api_key(api_key)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        api_key = validated_data.pop('api_key', None)
        if api_key is not None and api_key != '':
            instance.set_api_key(api_key)
        return super().update(instance, validated_data)


class ERPSyncEventSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    affected_user_email = serializers.ReadOnlyField(source='affected_user.institutional_email')

    class Meta:
        model = ERPSyncEvent
        fields = [
            'id',
            'connection',
            'school',
            'school_name',
            'provider',
            'event_id',
            'event_type',
            'processing_status',
            'affected_user',
            'affected_user_email',
            'detail',
            'processed_at',
            'created_at',
        ]
