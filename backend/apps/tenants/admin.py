from django.contrib import admin
from .models import School, CloudIntegration


class CloudIntegrationInline(admin.TabularInline):
    model = CloudIntegration
    extra = 0
    fields = ('provider', 'sync_enabled', 'sync_status', 'last_sync_at')
    readonly_fields = ('sync_status', 'last_sync_at')


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ('name', 'domain', 'nif', 'alvara_med_mescti', 'province', 'is_active', 'apd_notified', 'created_at')
    list_filter = ('is_active', 'province', 'apd_notified')
    search_fields = ('name', 'domain', 'nif', 'alvara_med_mescti')
    inlines = [CloudIntegrationInline]
    fieldsets = (
        ('Identificação Institucional', {
            'fields': ('name', 'domain', 'nif', 'alvara_med_mescti', 'is_active')
        }),
        ('Apresentação & Personalização Visual', {
            'fields': ('primary_color', 'logo_url', 'about_text')
        }),
        ('Contacto & Localização (Angola)', {
            'fields': ('contact_email', 'phone', 'province', 'municipality', 'address')
        }),
        ('Conformidade APD (Lei n.º 22/11)', {
            'fields': ('apd_notified', 'apd_dossier_number')
        }),
    )


@admin.register(CloudIntegration)
class CloudIntegrationAdmin(admin.ModelAdmin):
    list_display = ('school', 'provider', 'sync_enabled', 'sync_status', 'last_sync_at')
    list_filter = ('provider', 'sync_enabled', 'sync_status')
    search_fields = ('school__name', 'school__domain')
