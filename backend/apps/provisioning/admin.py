from django.contrib import admin
from .models import ProvisioningLog


@admin.register(ProvisioningLog)
class ProvisioningLogAdmin(admin.ModelAdmin):
    list_display = ('school', 'user', 'provider', 'action', 'status', 'external_id', 'created_at')
    list_filter = ('provider', 'action', 'status', 'school')
    search_fields = ('user__institutional_email', 'school__domain', 'external_id')
    readonly_fields = ('school', 'user', 'provider', 'action', 'status', 'external_id', 'detail', 'created_at')
