from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import DNSRecordViewSet, DomainConfigurationViewSet

app_name = 'domains'

router = DefaultRouter()
router.register(r'configs', DomainConfigurationViewSet, basename='domain-config')
router.register(r'records', DNSRecordViewSet, basename='dns-record')

urlpatterns = [
    path('', include(router.urls)),
]
