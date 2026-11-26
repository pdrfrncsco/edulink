from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import UserProfile
from apps.core.permissions import get_user_profile
from apps.directory.models import AcademicUser

User = get_user_model()


def build_user_payload(user) -> dict:
    profile = get_user_profile(user)
    school = profile.school if profile else None
    academic_user = profile.academic_user if profile else None
    latest_enrollment = (
        academic_user.enrollments.order_by('-created_at').first() if academic_user else None
    )
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
        'role': profile.role if profile else UserProfile.Role.SCHOOL_SECRETARY,
        'school_id': str(school.id) if school else None,
        'school_name': school.name if school else None,
        'school_domain': school.domain if school else None,
        'academic_user': {
            'id': str(academic_user.id),
            'full_name': academic_user.full_name,
            'role': academic_user.role,
            'institutional_email': academic_user.institutional_email,
            'bi_or_student_id': academic_user.bi_or_student_id,
            'is_active': academic_user.is_active,
            'academic_year': latest_enrollment.academic_year if latest_enrollment else None,
            'grade_class': latest_enrollment.grade_class if latest_enrollment else None,
            'enrollment_status': latest_enrollment.status if latest_enrollment else None,
        } if academic_user else None,
    }


def issue_jwt_pair_for_user(user) -> dict:
    refresh = RefreshToken.for_user(user)
    profile = get_user_profile(user)
    refresh['role'] = profile.role if profile else 'SCHOOL_SECRETARY'
    refresh['school_id'] = str(profile.school_id) if (profile and profile.school_id) else None
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': build_user_payload(user),
    }


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(max_length=255)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs['email'].strip().lower()
        password = attrs['password']

        user_obj = User.objects.filter(email__iexact=identifier).first() or User.objects.filter(
            username__iexact=identifier
        ).first()
        if not user_obj:
            raise serializers.ValidationError({'detail': 'Credenciais inválidas.'})

        user = authenticate(username=user_obj.username, password=password)
        if not user or not user.is_active:
            raise serializers.ValidationError({'detail': 'Credenciais inválidas ou conta inativa.'})

        attrs['user'] = user
        return attrs


class RegisterSecretarySerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
            raise serializers.ValidationError('Já existe uma conta registada com este e-mail.')
        return email

    @transaction.atomic
    def create(self, validated_data):
        full_name = validated_data['full_name'].strip()
        parts = full_name.split(None, 1)
        first_name = parts[0] if parts else ''
        last_name = parts[1] if len(parts) > 1 else ''
        email = validated_data['email']

        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name,
        )
        UserProfile.objects.create(
            user=user,
            role=UserProfile.Role.SCHOOL_SECRETARY,
            school=None,
        )
        return user


class ActivateAcademicAccountSerializer(serializers.Serializer):
    institutional_email = serializers.EmailField()
    bi_or_student_id = serializers.CharField(max_length=50)
    password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, attrs):
        email = attrs['institutional_email'].strip().lower()
        bi_id = attrs['bi_or_student_id'].strip()

        academic_user = AcademicUser.objects.select_related('school').filter(
            institutional_email__iexact=email,
            bi_or_student_id__iexact=bi_id,
        ).first()
        if not academic_user:
            raise serializers.ValidationError(
                {'detail': 'Não foi encontrado nenhum registo com este e-mail institucional e BI/Processo.'}
            )
        if not academic_user.is_active:
            raise serializers.ValidationError({'detail': 'A sua conta académica encontra-se inativa. Contacte a secretaria.'})
        if hasattr(academic_user, 'account_profile') and academic_user.account_profile is not None:
            raise serializers.ValidationError({'detail': 'Esta conta académica já foi ativada. Utilize o formulário de entrada.'})
        if User.objects.filter(username__iexact=email).exists():
            raise serializers.ValidationError({'detail': 'Já existe uma credencial associada a este e-mail.'})

        attrs['academic_user'] = academic_user
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        academic_user = validated_data['academic_user']
        parts = academic_user.full_name.strip().split(None, 1)
        first_name = parts[0] if parts else ''
        last_name = parts[1] if len(parts) > 1 else ''
        email = academic_user.institutional_email.lower()

        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name,
        )
        role = (
            UserProfile.Role.TEACHER
            if academic_user.role == AcademicUser.Role.TEACHER
            else UserProfile.Role.STUDENT
        )
        UserProfile.objects.create(
            user=user,
            role=role,
            school=academic_user.school,
            academic_user=academic_user,
        )
        return user


class AdminUserProfileSerializer(serializers.ModelSerializer):
    """Gestão de perfis e vínculos escola/papel exclusiva do Administrador da Plataforma."""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.SerializerMethodField()
    user_is_active = serializers.BooleanField(source='user.is_active')
    school_name = serializers.CharField(source='school.name', read_only=True)
    school_domain = serializers.CharField(source='school.domain', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'username',
            'email',
            'full_name',
            'role',
            'school',
            'school_name',
            'school_domain',
            'user_is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'username', 'email', 'full_name', 'created_at']

    def get_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data is not None and 'is_active' in user_data:
            req = self.context.get('request')
            if req and req.user and req.user.id == instance.user_id and not user_data['is_active']:
                raise serializers.ValidationError({'user_is_active': 'Não pode desativar a sua própria conta.'})
            instance.user.is_active = user_data['is_active']
            instance.user.save(update_fields=['is_active'])
        return super().update(instance, validated_data)
