from django.contrib import admin
from .models import GlobalVerifierApplication


@admin.register(GlobalVerifierApplication)
class GlobalVerifierApplicationAdmin(admin.ModelAdmin):
    list_display = ('school', 'verifier', 'status', 'submission_reference', 'updated_at')
    list_filter = ('verifier', 'status')
    search_fields = ('school__name', 'school__domain', 'submission_reference')
