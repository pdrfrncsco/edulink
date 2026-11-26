from rest_framework import serializers

from apps.billing.models import AGTInvoice, KwanzaPayment, SchoolSubscription


class SchoolSubscriptionSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    plan_label = serializers.CharField(source='get_plan_code_display', read_only=True)

    class Meta:
        model = SchoolSubscription
        fields = [
            'id',
            'school',
            'school_name',
            'plan_code',
            'plan_label',
            'annual_price_aoa',
            'status',
            'starts_at',
            'expires_at',
            'auto_renew',
            'created_at',
        ]
        read_only_fields = ['id', 'annual_price_aoa', 'status', 'starts_at', 'expires_at', 'created_at']


class KwanzaPaymentSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    method_label = serializers.CharField(source='get_payment_method_display', read_only=True)
    invoice_id = serializers.UUIDField(source='agt_invoice.id', read_only=True)
    invoice_number = serializers.CharField(source='agt_invoice.invoice_number', read_only=True)

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
            'customer_phone',
            'customer_name',
            'customer_nif',
            'description',
            'gateway_transaction_id',
            'confirmed_at',
            'invoice_id',
            'invoice_number',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'reference',
            'currency',
            'status',
            'gateway_transaction_id',
            'confirmed_at',
            'created_at',
        ]


class AGTInvoiceSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    payment_reference = serializers.CharField(source='payment.reference', read_only=True)

    class Meta:
        model = AGTInvoice
        fields = [
            'id',
            'school',
            'school_name',
            'payment',
            'payment_reference',
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
