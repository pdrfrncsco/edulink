from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    ActivateAcademicAccountAPIView,
    LoginAPIView,
    MeAPIView,
    RegisterSecretaryAPIView,
    SSOMetadataAPIView,
    SyncKeycloakAPIView,
)

app_name = 'accounts'

urlpatterns = [
    path('login/', LoginAPIView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('register-secretary/', RegisterSecretaryAPIView.as_view(), name='register-secretary'),
    path('activate-academic/', ActivateAcademicAccountAPIView.as_view(), name='activate-academic'),
    path('me/', MeAPIView.as_view(), name='me'),
    path('sso-metadata/', SSOMetadataAPIView.as_view(), name='sso-metadata'),
    path('sync-keycloak/<uuid:school_id>/', SyncKeycloakAPIView.as_view(), name='sync-keycloak'),
]
