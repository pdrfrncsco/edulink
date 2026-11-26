from types import SimpleNamespace
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission


def get_user_profile(user):
    """
    Devolve o UserProfile associado ao utilizador autenticado.
    Superutilizadores Django sem perfil explícito atuam como PLATFORM_ADMIN.
    """
    if not user or not user.is_authenticated:
        return None
    profile = getattr(user, 'edulink_profile', None)
    if profile is not None:
        return profile
    if user.is_superuser:
        return SimpleNamespace(
            role='PLATFORM_ADMIN',
            school=None,
            school_id=None,
            academic_user=None,
            academic_user_id=None,
        )
    return None


def is_platform_admin(user) -> bool:
    profile = get_user_profile(user)
    return bool(profile and profile.role == 'PLATFORM_ADMIN')


class IsPlatformAdminOrSchoolSecretary(BasePermission):
    """
    Permite acesso apenas a PLATFORM_ADMIN ou SCHOOL_SECRETARY autenticado.
    Estudantes e docentes não podem aceder aos endpoints administrativos.
    """
    message = 'Acesso restrito à Secretaria Escolar ou Administração EduLink.'

    def has_permission(self, request, view):
        profile = get_user_profile(request.user)
        if not profile:
            return False
        if profile.role == 'PLATFORM_ADMIN':
            return True
        return profile.role == 'SCHOOL_SECRETARY'


class TenantScopedMixin:
    """
    Isolamento estrito por school_id em ViewSets DRF:
    - PLATFORM_ADMIN vê todas as escolas.
    - SCHOOL_SECRETARY vê e manipula apenas registos da sua própria escola.
    """
    tenant_lookup_field = 'school_id'
    tenant_serializer_field = 'school'

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if is_platform_admin(user):
            return qs
        profile = get_user_profile(user)
        if not profile or not profile.school_id:
            return qs.none()
        return qs.filter(**{self.tenant_lookup_field: profile.school_id})

    def perform_create(self, serializer):
        user = self.request.user
        if is_platform_admin(user):
            serializer.save()
            return
        profile = get_user_profile(user)
        if not profile or not profile.school_id:
            raise PermissionDenied('A sua conta de secretaria ainda não está associada a nenhuma escola.')

        provided = serializer.validated_data.get(self.tenant_serializer_field)
        if self.tenant_serializer_field == 'school':
            if provided and str(provided.id) != str(profile.school_id):
                raise PermissionDenied('Não tem permissão para criar registos noutra escola.')
            serializer.save(school=profile.school)
        elif self.tenant_serializer_field == 'domain_config':
            if provided and str(provided.school_id) != str(profile.school_id):
                raise PermissionDenied('Não tem permissão para criar registos DNS noutra escola.')
            serializer.save()
        else:
            serializer.save()
