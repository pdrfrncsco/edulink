from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.billing.views import (
    AGTInvoiceViewSet,
    KwanzaPaymentViewSet,
    KwanzaWebhookAPIView,
    PlanCatalogAPIView,
    SchoolSubscriptionViewSet,
)

app_name = 'billing'

router = DefaultRouter()
router.register(r'subscriptions', SchoolSubscriptionViewSet, basename='subscription')
router.register(r'payments', KwanzaPaymentViewSet, basename='payment')
router.register(r'invoices', AGTInvoiceViewSet, basename='invoice')

urlpatterns = [
    path('plans/', PlanCatalogAPIView.as_view(), name='plan-catalog'),
    path('webhooks/kwanza/', KwanzaWebhookAPIView.as_view(), name='kwanza-webhook'),
    path('', include(router.urls)),
]
