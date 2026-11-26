from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    ActivateAcademicAccountAPIView,
    AdminUserProfileViewSet,
    LoginAPIView,
    MeAPIView,
    RegisterSecretaryAPIView,
    SSOMetadataAPIView,
    SyncKeycloakAPIView,
)

app_name = 'accounts'

router = DefaultRouter()
router.register(r'profiles', AdminUserProfileViewSet, basename='user-profile')

urlpatterns = [
    path('login/', LoginAPIView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('register-secretary/', RegisterSecretaryAPIView.as_view(), name='register-secretary'),
    path('activate-academic/', ActivateAcademicAccountAPIView.as_view(), name='activate-academic'),
    path('me/', MeAPIView.as_view(), name='me'),
    path('sso-metadata/', SSOMetadataAPIView.as_view(), name='sso-metadata'),
    path('sync-keycloak/<uuid:school_id>/', SyncKeycloakAPIView.as_view(), name='sync-keycloak'),
    path('', include(router.urls)),
]
