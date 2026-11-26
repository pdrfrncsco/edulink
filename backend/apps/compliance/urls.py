from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import APDDossierViewSet, ParentalConsentViewSet

app_name = 'compliance'

router = DefaultRouter()
router.register(r'dossiers', APDDossierViewSet, basename='apd-dossier')
router.register(r'consents', ParentalConsentViewSet, basename='parental-consent')

urlpatterns = [
    path('', include(router.urls)),
]
