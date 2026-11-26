from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    ProvisioningLogViewSet,
    TestCloudIntegrationAPIView,
    TriggerBatchSyncAPIView,
    TriggerUserSyncAPIView,
)

app_name = 'provisioning'

router = DefaultRouter()
router.register(r'logs', ProvisioningLogViewSet, basename='provisioning-log')

urlpatterns = [
    path('sync-school/<uuid:school_id>/', TriggerBatchSyncAPIView.as_view(), name='sync-school'),
    path('sync-user/<uuid:user_id>/', TriggerUserSyncAPIView.as_view(), name='sync-user'),
    path('test-connection/<uuid:integration_id>/', TestCloudIntegrationAPIView.as_view(), name='test-connection'),
    path('', include(router.urls)),
]
