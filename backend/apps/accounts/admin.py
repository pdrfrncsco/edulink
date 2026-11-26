from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'school', 'academic_user', 'created_at')
    list_filter = ('role', 'school')
    search_fields = ('user__username', 'user__email', 'school__name', 'academic_user__institutional_email')
