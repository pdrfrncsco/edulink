from django.contrib import admin
from .models import DNSRecord, DomainConfiguration


class DNSRecordInline(admin.TabularInline):
    model = DNSRecord
    extra = 0
    fields = ('record_type', 'name', 'content', 'priority', 'proxied', 'purpose', 'sync_state', 'propagated')
    readonly_fields = ('sync_state', 'propagated')


@admin.register(DomainConfiguration)
class DomainConfigurationAdmin(admin.ModelAdmin):
    list_display = ('school', 'registrar_status', 'cloudflare_zone_id', 'last_synced_at')
    list_filter = ('registrar_status',)
    search_fields = ('school__domain', 'school__name', 'cloudflare_zone_id')
    inlines = [DNSRecordInline]


@admin.register(DNSRecord)
class DNSRecordAdmin(admin.ModelAdmin):
    list_display = ('domain_config', 'record_type', 'name', 'purpose', 'priority', 'sync_state', 'propagated')
    list_filter = ('record_type', 'purpose', 'sync_state', 'propagated')
    search_fields = ('domain_config__school__domain', 'name', 'content')
