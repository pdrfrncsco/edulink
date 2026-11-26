import time
import jwt
from django.conf import settings
from apps.directory.models import AcademicUser, Enrollment


def get_jwt_secret() -> str:
    return getattr(settings, 'EDULINK_JWT_SECRET', 'edulink-dev-jwt-secret-2026')


def generate_passport_token(user: AcademicUser, enrollment: Enrollment = None, validity_seconds: int = 86400 * 30) -> str:
    """
    Gera um token JWT assinado digitalmente pela EduLink
    para embutir no QR Code do Cartão Académico Digital.
    Validade padrão: 30 dias com renovação automática online.
    """
    now = int(time.time())
    if not enrollment:
        enrollment = user.enrollments.order_by('-created_at').first()

    payload = {
        'iss': 'https://edulink.ao',
        'sub': str(user.id),
        'user_id': str(user.id),
        'full_name': user.full_name,
        'institutional_email': user.institutional_email,
        'bi_or_student_id': user.bi_or_student_id,
        'role': user.role,
        'school_id': str(user.school_id),
        'school_name': user.school.name,
        'school_domain': user.school.domain,
        'academic_year': enrollment.academic_year if enrollment else 'N/A',
        'grade_class': enrollment.grade_class if enrollment else 'N/A',
        'status': enrollment.status if enrollment else ('ACTIVE' if user.is_active else 'SUSPENDED'),
        'iat': now,
        'exp': now + validity_seconds,
    }

    return jwt.encode(payload, get_jwt_secret(), algorithm='HS256')


def verify_passport_token(token_str: str) -> dict:
    """
    Decodifica o token JWT, valida a assinatura e cruza em tempo real
    com a base de dados para garantir que a matrícula não foi SUSPENSA.
    """
    try:
        payload = jwt.decode(token_str, get_jwt_secret(), algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return {'is_valid': False, 'error': 'Cartão digital expirado. Por favor conecte-se à internet para atualizar.'}
    except jwt.InvalidTokenError:
        return {'is_valid': False, 'error': 'Assinatura digital do cartão inválida ou adulterada.'}

    user_id = payload.get('sub')
    user = AcademicUser.objects.filter(id=user_id).select_related('school').first()

    if not user:
        return {'is_valid': False, 'error': 'Registo acadêmico não encontrado.'}

    if not user.is_active:
        return {'is_valid': False, 'error': 'Utilizador inativo no directório institucional.'}

    # Verifica o estado da matrícula atual
    latest_enrollment = user.enrollments.order_by('-created_at').first()
    if latest_enrollment and latest_enrollment.status == Enrollment.Status.SUSPENDED:
        return {
            'is_valid': False,
            'error': 'Matrícula suspensa pela direção da instituição de ensino.'
        }

    return {
        'is_valid': True,
        'student_info': {
            'full_name': user.full_name,
            'role': user.role,
            'institutional_email': user.institutional_email,
            'bi_or_student_id': user.bi_or_student_id,
            'school_name': user.school.name,
            'school_domain': user.school.domain,
            'academic_year': latest_enrollment.academic_year if latest_enrollment else payload.get('academic_year'),
            'grade_class': latest_enrollment.grade_class if latest_enrollment else payload.get('grade_class'),
            'status': latest_enrollment.status if latest_enrollment else 'ACTIVE',
            'verified_at': int(time.time()),
        }
    }
