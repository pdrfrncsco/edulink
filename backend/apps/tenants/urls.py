from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CloudIntegrationViewSet,
    SchoolOnboardAPIView,
    SchoolPublicDetailView,
    SchoolViewSet,
    TLSDomainCheckAPIView,
)

app_name = 'tenants'

router = DefaultRouter()
router.register(r'schools', SchoolViewSet, basename='school')
router.register(r'integrations', CloudIntegrationViewSet, basename='cloud-integration')

urlpatterns = [
    path('by-domain/', SchoolPublicDetailView.as_view(), name='school-by-domain'),
    path('tls-check/', TLSDomainCheckAPIView.as_view(), name='tls-check'),
    path('onboard/', SchoolOnboardAPIView.as_view(), name='school-onboard'),
    path('', include(router.urls)),
]
