from rest_framework import serializers
from .models import BenefitOffer, BenefitPartner, BenefitRedemption


class BenefitPartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = BenefitPartner
        fields = [
            'id',
            'name',
            'category',
            'description',
            'discount_label',
            'eligible_roles',
            'website_url',
            'is_active',
            'created_at',
        ]


class BenefitOfferSerializer(serializers.ModelSerializer):
    partner_name = serializers.ReadOnlyField(source='partner.name')
    partner_category = serializers.ReadOnlyField(source='partner.category')
    discount_label = serializers.ReadOnlyField(source='partner.discount_label')
    eligible_roles = serializers.ReadOnlyField(source='partner.eligible_roles')

    class Meta:
        model = BenefitOffer
        fields = [
            'id',
            'partner',
            'partner_name',
            'partner_category',
            'discount_label',
            'eligible_roles',
            'title',
            'promo_code',
            'price_aoa',
            'requires_active_enrollment',
            'is_active',
        ]


class BenefitRedemptionSerializer(serializers.ModelSerializer):
    offer_title = serializers.ReadOnlyField(source='offer.title')
    partner_name = serializers.ReadOnlyField(source='partner.name')
    user_email = serializers.ReadOnlyField(source='user.institutional_email')
    school_name = serializers.ReadOnlyField(source='school.name')

    class Meta:
        model = BenefitRedemption
        fields = [
            'id',
            'offer',
            'offer_title',
            'partner',
            'partner_name',
            'user',
            'user_email',
            'school',
            'school_name',
            'verification_method',
            'voucher_code',
            'status',
            'redeemed_at',
        ]
