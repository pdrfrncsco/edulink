import time

import jwt
from django.conf import settings

from apps.directory.models import AcademicUser, Enrollment

PASSPORT_ISSUER = 'https://edulink.ao'
PASSPORT_TOKEN_TYPE = 'edulink_passport'


def get_jwt_secret() -> str:
    """
    Obtém a chave de assinatura do Passaporte Digital.
    Usa EDULINK_JWT_SECRET dedicada e, na ausência desta, recua para SECRET_KEY
    para evitar chaves literais fracas em produção.
    """
    secret = getattr(settings, 'EDULINK_JWT_SECRET', '') or getattr(settings, 'SECRET_KEY', '')
    if not secret:
        raise RuntimeError('EDULINK_JWT_SECRET ou SECRET_KEY deve estar configurada.')
    return secret


def _get_school_host(school) -> str:
    return school.domain or school.effective_site_host


def generate_passport_token(
    user: AcademicUser,
    enrollment: Enrollment | None = None,
    validity_seconds: int = 86400 * 30,
) -> str:
    """
    Gera um token JWT assinado digitalmente pela EduLink
    para embutir no QR Code do Cartão Académico Digital.
    Validade padrão: 30 dias com renovação automática online.
    """
    now = int(time.time())
    if not enrollment:
        enrollment = user.enrollments.order_by('-created_at').first()

    school = user.school
    school_host = _get_school_host(school)

    payload = {
        'iss': PASSPORT_ISSUER,
        'typ': PASSPORT_TOKEN_TYPE,
        'sub': str(user.id),
        'user_id': str(user.id),
        'full_name': user.full_name,
        'institutional_email': user.institutional_email,
        'bi_or_student_id': user.bi_or_student_id,
        'role': user.role,
        'school_id': str(user.school_id),
        'school_name': school.name,
        'school_domain': school_host,
        'institution_type': school.institution_type,
        'academic_year': enrollment.academic_year if enrollment else 'N/A',
        'grade_class': enrollment.grade_class if enrollment else 'N/A',
        'status': enrollment.status if enrollment else ('ACTIVE' if user.is_active else 'SUSPENDED'),
        'iat': now,
        'exp': now + validity_seconds,
    }

    token = jwt.encode(payload, get_jwt_secret(), algorithm='HS256')
    return token.decode('utf-8') if isinstance(token, bytes) else token


def verify_passport_token(token_str: str) -> dict:
    """
    Descodifica o token JWT, valida assinatura/emissor e cruza em tempo real
    com a base de dados para garantir que a escola, o utilizador e a matrícula estão ativos.
    """
    try:
        payload = jwt.decode(
            token_str,
            get_jwt_secret(),
            algorithms=['HS256'],
            issuer=PASSPORT_ISSUER,
            options={'require': ['exp', 'sub', 'iss']},
        )
    except jwt.ExpiredSignatureError:
        return {
            'is_valid': False,
            'error': 'Cartão digital expirado. Por favor, ligue-se à internet para atualizar.',
        }
    except jwt.InvalidTokenError:
        return {
            'is_valid': False,
            'error': 'Assinatura digital do cartão inválida ou adulterada.',
        }

    # Proteção contra confusão de tokens (ex.: usar um JWT de login como QR Code)
    token_type = payload.get('typ')
    if token_type and token_type != PASSPORT_TOKEN_TYPE:
        return {
            'is_valid': False,
            'error': 'Tipo de token inválido para verificação do Passaporte Académico.',
        }

    user_id = payload.get('sub')
    user = AcademicUser.objects.filter(id=user_id).select_related('school').first()

    if not user:
        return {'is_valid': False, 'error': 'Registo académico não encontrado.'}

    if not user.school.is_active:
        return {
            'is_valid': False,
            'error': 'A instituição de ensino associada encontra-se inativa na plataforma EduLink.',
        }

    if not user.is_active:
        return {'is_valid': False, 'error': 'Utilizador inativo no directório institucional.'}

    latest_enrollment = user.enrollments.order_by('-created_at').first()
    if latest_enrollment:
        if latest_enrollment.status == Enrollment.Status.SUSPENDED:
            return {
                'is_valid': False,
                'error': 'Matrícula suspensa pela direção da instituição de ensino.',
            }
        if latest_enrollment.status != Enrollment.Status.ACTIVE:
            return {
                'is_valid': False,
                'error': 'Matrícula sem estado ativo no ano lectivo corrente.',
            }

    school = user.school
    return {
        'is_valid': True,
        'student_info': {
            'full_name': user.full_name,
            'role': user.role,
            'institutional_email': user.institutional_email,
            'bi_or_student_id': user.bi_or_student_id,
            'school_name': school.name,
            'school_domain': _get_school_host(school),
            'school_primary_color': school.primary_color,
            'school_logo_url': school.logo_url,
            'institution_type': school.institution_type,
            'is_canva_k12_eligible': school.is_canva_k12_eligible,
            'apd_notified': school.apd_notified,
            'apd_dossier_number': school.apd_dossier_number,
            'academic_year': latest_enrollment.academic_year if latest_enrollment else payload.get('academic_year'),
            'grade_class': latest_enrollment.grade_class if latest_enrollment else payload.get('grade_class'),
            'status': latest_enrollment.status if latest_enrollment else 'ACTIVE',
            'verified_at': int(time.time()),
        },
    }