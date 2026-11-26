from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    GlobalVerifierApplicationViewSet,
    InstitutionDossierPublicAPIView,
    IssuePassportTokenAPIView,
    VerifyPassportAPIView,
)

app_name = 'passport'

router = DefaultRouter()
router.register(r'verifiers', GlobalVerifierApplicationViewSet, basename='global-verifier')

urlpatterns = [
    path('issue/', IssuePassportTokenAPIView.as_view(), name='issue-passport'),
    path('verify/', VerifyPassportAPIView.as_view(), name='verify-passport'),
    path('institution-dossier/', InstitutionDossierPublicAPIView.as_view(), name='institution-dossier'),
    path('', include(router.urls)),
]
