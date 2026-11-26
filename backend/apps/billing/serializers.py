from django.conf import settings
from rest_framework import serializers

from apps.billing.models import AGTInvoice, KwanzaPayment, SchoolSubscription


class SchoolSubscriptionSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    plan_label = serializers.CharField(source='get_plan_code_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    billing_type = serializers.SerializerMethodField()

    class Meta:
        model = SchoolSubscription
        fields = [
            'id',
            'school',
            'school_name',
            'plan_code',
            'plan_label',
            'billing_type',
            'annual_price_aoa',
            'status',
            'status_label',
            'starts_at',
            'expires_at',
            'auto_renew',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'billing_type',
            'annual_price_aoa',
            'status',
            'status_label',
            'starts_at',
            'expires_at',
            'created_at',
        ]

    def get_billing_type(self, obj) -> str:
        return 'ONE_TIME' if obj.plan_code == SchoolSubscription.PlanCode.SETUP_DIGITAL else 'ANNUAL'


class KwanzaPaymentSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    method_label = serializers.CharField(source='get_payment_method_display', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    invoice_id = serializers.UUIDField(source='agt_invoice.id', read_only=True)
    invoice_number = serializers.CharField(source='agt_invoice.invoice_number', read_only=True)
    sandbox_confirm_allowed = serializers.SerializerMethodField()

    class Meta:
        model = KwanzaPayment
        fields = [
            'id',
            'school',
            'school_name',
            'subscription',
            'academic_user',
            'benefit_offer',
            'reference',
            'payment_method',
            'method_label',
            'amount_aoa',
            'currency',
            'status',
            'status_label',
            'customer_phone',
            'customer_name',
            'customer_nif',
            'description',
            'gateway_transaction_id',
            'confirmed_at',
            'invoice_id',
            'invoice_number',
            'sandbox_confirm_allowed',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'reference',
            'currency',
            'status',
            'status_label',
            'gateway_transaction_id',
            'confirmed_at',
            'sandbox_confirm_allowed',
            'created_at',
        ]

    def get_sandbox_confirm_allowed(self, obj) -> bool:
        sandbox_enabled = bool(getattr(settings, 'KWANZA_SANDBOX_ENABLED', False))
        return sandbox_enabled and obj.status == KwanzaPayment.Status.PENDING


class AGTInvoiceSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    payment_reference = serializers.CharField(source='payment.reference', read_only=True)
    payment_method_label = serializers.CharField(source='payment.get_payment_method_display', read_only=True)
    payment_description = serializers.CharField(source='payment.description', read_only=True)

    class Meta:
        model = AGTInvoice
        fields = [
            'id',
            'school',
            'school_name',
            'payment',
            'payment_reference',
            'payment_method_label',
            'payment_description',
            'series',
            'sequence_number',
            'invoice_number',
            'issue_date',
            'issuer_name',
            'issuer_nif',
            'customer_name',
            'customer_nif',
            'subtotal_aoa',
            'iva_rate',
            'iva_amount_aoa',
            'total_aoa',
            'previous_hash',
            'agt_hash',
            'hash_control',
            'software_certificate_no',
            'qr_payload',
            'saft_payload',
            'created_at',
        ]