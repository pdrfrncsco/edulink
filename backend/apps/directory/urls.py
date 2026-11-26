from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AcademicUserViewSet,
    EnrollmentViewSet,
    CSVImportAPIView,
)

app_name = 'directory'

router = DefaultRouter()
router.register(r'users', AcademicUserViewSet, basename='academic-user')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')

urlpatterns = [
    path('upload-csv/', CSVImportAPIView.as_view(), name='upload-csv'),
    path('', include(router.urls)),
]
