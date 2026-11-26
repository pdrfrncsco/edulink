from django.contrib import admin
from .models import APDDossier, ParentalConsent


@admin.register(APDDossier)
class APDDossierAdmin(admin.ModelAdmin):
    list_display = ('school', 'submission_type', 'status', 'has_minors', 'apd_reference_number', 'submitted_at')
    list_filter = ('status', 'submission_type', 'has_minors')
    search_fields = ('school__name', 'school__domain', 'apd_reference_number', 'director_full_name')
    readonly_fields = ('generated_payload', 'submitted_at')


@admin.register(ParentalConsent)
class ParentalConsentAdmin(admin.ModelAdmin):
    list_display = ('student', 'school', 'guardian_full_name', 'guardian_relationship', 'status', 'signed_at')
    list_filter = ('status', 'guardian_relationship', 'is_minor', 'school')
    search_fields = ('student__full_name', 'student__institutional_email', 'guardian_full_name', 'guardian_bi')
    readonly_fields = ('consent_token', 'signed_at', 'revoked_at', 'signed_ip', 'signed_user_agent')
