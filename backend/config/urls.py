from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check(request):
    """Healthcheck endpoint para Docker e orquestração."""
    return JsonResponse({
        'status': 'healthy',
        'platform': 'EduLink Backend',
        'version': '1.0.0-sprint1'
    })


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),

    # API v1
    path('api/v1/auth/', include('apps.accounts.urls', namespace='accounts')),
    path('api/v1/tenants/', include('apps.tenants.urls', namespace='tenants')),
    path('api/v1/directory/', include('apps.directory.urls', namespace='directory')),
    path('api/v1/passport/', include('apps.passport.urls', namespace='passport')),
    path('api/v1/provisioning/', include('apps.provisioning.urls', namespace='provisioning')),
    path('api/v1/domains/', include('apps.domains.urls', namespace='domains')),
    path('api/v1/compliance/', include('apps.compliance.urls', namespace='compliance')),
    path('api/v1/erp-sync/', include('apps.erp_sync.urls', namespace='erp_sync')),
    path('api/v1/benefits/', include('apps.benefits.urls', namespace='benefits')),
    path('api/v1/billing/', include('apps.billing.urls', namespace='billing')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
