from rest_framework import serializers
from .models import DNSRecord, DomainConfiguration


class DNSRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = DNSRecord
        fields = [
            'id',
            'domain_config',
            'record_type',
            'name',
            'content',
            'ttl',
            'priority',
            'proxied',
            'purpose',
            'cloudflare_record_id',
            'sync_state',
            'propagated',
            'last_checked_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['cloudflare_record_id', 'sync_state', 'propagated', 'last_checked_at']


class DomainConfigurationSerializer(serializers.ModelSerializer):
    school_domain = serializers.ReadOnlyField(source='school.domain')
    school_name = serializers.ReadOnlyField(source='school.name')
    records = DNSRecordSerializer(many=True, read_only=True)
    api_token = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        help_text='Cloudflare API Token da escola (opcional; encriptado com Fernet)',
    )

    class Meta:
        model = DomainConfiguration
        fields = [
            'id',
            'school',
            'school_domain',
            'school_name',
            'registrar_status',
            'cloudflare_zone_id',
            'cloudflare_account_id',
            'api_token',
            'nameservers',
            'google_verification_token',
            'microsoft_verification_token',
            'dkim_selector',
            'dkim_public_key',
            'target_web_ip_or_cname',
            'last_synced_at',
            'last_error',
            'records',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['registrar_status', 'cloudflare_zone_id', 'nameservers', 'last_synced_at', 'last_error']

    def create(self, validated_data):
        api_token = validated_data.pop('api_token', '')
        instance = DomainConfiguration(**validated_data)
        if api_token:
            instance.set_api_token(api_token)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        api_token = validated_data.pop('api_token', None)
        if api_token is not None and api_token != '':
            instance.set_api_token(api_token)
        return super().update(instance, validated_data)
