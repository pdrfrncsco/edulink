from django.contrib import admin
from .models import ERPConnection, ERPSyncEvent


@admin.register(ERPConnection)
class ERPConnectionAdmin(admin.ModelAdmin):
    list_display = ('school', 'provider', 'is_active', 'last_sync_status', 'last_event_at')
    list_filter = ('provider', 'is_active', 'last_sync_status')
    search_fields = ('school__name', 'school__domain')


@admin.register(ERPSyncEvent)
class ERPSyncEventAdmin(admin.ModelAdmin):
    list_display = ('school', 'provider', 'event_type', 'processing_status', 'affected_user', 'created_at')
    list_filter = ('provider', 'event_type', 'processing_status')
    search_fields = ('event_id', 'affected_user__institutional_email', 'school__domain')
    readonly_fields = ('payload', 'processed_at', 'created_at')
