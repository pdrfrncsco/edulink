from django.contrib import admin
from .models import BenefitOffer, BenefitPartner, BenefitRedemption


@admin.register(BenefitPartner)
class BenefitPartnerAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'discount_label', 'is_active', 'created_at')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'discount_label')


@admin.register(BenefitOffer)
class BenefitOfferAdmin(admin.ModelAdmin):
    list_display = ('title', 'partner', 'price_aoa', 'requires_active_enrollment', 'is_active')
    list_filter = ('is_active', 'requires_active_enrollment', 'partner')
    search_fields = ('title', 'promo_code', 'partner__name')


@admin.register(BenefitRedemption)
class BenefitRedemptionAdmin(admin.ModelAdmin):
    list_display = ('voucher_code', 'partner', 'offer', 'user', 'verification_method', 'status', 'redeemed_at')
    list_filter = ('status', 'verification_method', 'partner')
    search_fields = ('voucher_code', 'user__institutional_email')
