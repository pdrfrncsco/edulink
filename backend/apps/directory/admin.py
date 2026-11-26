from django.contrib import admin
from .models import AcademicUser, Enrollment


class EnrollmentInline(admin.TabularInline):
    model = Enrollment
    extra = 0
    fields = ('academic_year', 'grade_class', 'status', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(AcademicUser)
class AcademicUserAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'role', 'institutional_email', 'bi_or_student_id', 'school', 'is_active', 'created_at')
    list_filter = ('role', 'is_active', 'school')
    search_fields = ('full_name', 'institutional_email', 'bi_or_student_id')
    inlines = [EnrollmentInline]


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'school', 'grade_class', 'academic_year', 'status', 'updated_at')
    list_filter = ('status', 'academic_year', 'school')
    search_fields = ('user__full_name', 'user__institutional_email', 'grade_class')
