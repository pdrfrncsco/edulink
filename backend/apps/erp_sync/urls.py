from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import ERPConnectionViewSet, ERPSyncEventViewSet, ERPWebhookInboundAPIView

app_name = 'erp_sync'

router = DefaultRouter()
router.register(r'connections', ERPConnectionViewSet, basename='erp-connection')
router.register(r'events', ERPSyncEventViewSet, basename='erp-event')

urlpatterns = [
    path('webhook/<str:provider>/<uuid:connection_id>/', ERPWebhookInboundAPIView.as_view(), name='erp-webhook'),
    path('', include(router.urls)),
]
