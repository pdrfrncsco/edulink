from django.urls import path
from .views import IssuePassportTokenAPIView, VerifyPassportAPIView

app_name = 'passport'

urlpatterns = [
    path('issue/', IssuePassportTokenAPIView.as_view(), name='issue-passport'),
    path('verify/', VerifyPassportAPIView.as_view(), name='verify-passport'),
]
