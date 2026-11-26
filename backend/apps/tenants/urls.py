from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CloudIntegrationViewSet,
    SchoolOnboardAPIView,
    SchoolPublicDetailView,
    SchoolViewSet,
    TLSDomainCheckAPIView,
    SchoolOnboardingDocumentListCreateView,
    SchoolOnboardingDocumentReviewView,
    
)

app_name = 'tenants'

router = DefaultRouter()
router.register(r'schools', SchoolViewSet, basename='school')
router.register(r'integrations', CloudIntegrationViewSet, basename='cloud-integration')

urlpatterns = [
    path('by-domain/', SchoolPublicDetailView.as_view(), name='school-by-domain'),
    path('tls-check/', TLSDomainCheckAPIView.as_view(), name='tls-check'),
    path('onboard/', SchoolOnboardAPIView.as_view(), name='school-onboard'),
    path(
    '<uuid:school_id>/documents/',
    SchoolOnboardingDocumentListCreateView.as_view(),
    name='school-documents',
),
path(
    '<uuid:school_id>/documents/<uuid:doc_id>/review/',
    SchoolOnboardingDocumentReviewView.as_view(),
    name='school-document-review',
),
    path('', include(router.urls)),
]
