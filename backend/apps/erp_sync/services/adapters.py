import hashlib
import hmac
from dataclasses import dataclass

from apps.directory.models import AcademicUser
from apps.erp_sync.models import ERPSyncEvent


class ERPAdapterError(ValueError):
    """Erro ao validar ou normalizar um payload proveniente de ERP externo."""


@dataclass(frozen=True)
class CanonicalERPEvent:
    event_id: str
    event_type: str
    full_name: str
    bi_or_student_id: str
    role: str
    grade_class: str
    academic_year: str
    phone: str
    personal_email: str


# Tabela uniforme de mapeamento para os ERPs escolares angolanos
PROVIDER_SCHEMAS = {
    'KLASSE': {
        'event_id_keys': ('event_id', 'id_evento', 'id'),
        'event_type_keys': ('evento', 'event_type', 'event'),
        'entity_key': 'aluno',
        'event_map': {
            'matricula.criada': ERPSyncEvent.EventType.STUDENT_ENROLLED,
            'matricula.renovada': ERPSyncEvent.EventType.STUDENT_ENROLLED,
            'docente.atribuido': ERPSyncEvent.EventType.TEACHER_ASSIGNED,
            'propina.atraso': ERPSyncEvent.EventType.TUITION_OVERDUE,
            'propina.liquidada': ERPSyncEvent.EventType.TUITION_SETTLED,
            'matricula.transferida': ERPSyncEvent.EventType.ENROLLMENT_TRANSFERRED,
        },
        'fields': {
            'full_name': ('nome_completo', 'nome', 'full_name'),
            'bi_or_student_id': ('bi', 'numero_processo', 'bi_ou_processo'),
            'role': ('tipo', 'papel', 'role'),
            'grade_class': ('turma', 'classe', 'grade_class'),
            'academic_year': ('ano_letivo', 'ano_lectivo', 'academic_year'),
            'phone': ('telemovel', 'telefone', 'phone'),
            'personal_email': ('email', 'email_pessoal'),
        },
    },
    'SYSPORTAL': {
        'event_id_keys': ('event_id', 'id'),
        'event_type_keys': ('event', 'event_type'),
        'entity_key': 'student',
        'event_map': {
            'enrollment.active': ERPSyncEvent.EventType.STUDENT_ENROLLED,
            'teacher.assigned': ERPSyncEvent.EventType.TEACHER_ASSIGNED,
            'fee.overdue': ERPSyncEvent.EventType.TUITION_OVERDUE,
            'fee.paid': ERPSyncEvent.EventType.TUITION_SETTLED,
            'enrollment.transferred': ERPSyncEvent.EventType.ENROLLMENT_TRANSFERRED,
        },
        'fields': {
            'full_name': ('name', 'full_name', 'nome'),
            'bi_or_student_id': ('document_id', 'bi_or_student_id', 'student_code'),
            'role': ('type', 'role'),
            'grade_class': ('class_name', 'grade_class', 'turma'),
            'academic_year': ('year', 'academic_year'),
            'phone': ('phone', 'mobile'),
            'personal_email': ('email', 'personal_email'),
        },
    },
    'KACENNU': {
        'event_id_keys': ('id_transacao', 'event_id', 'id'),
        'event_type_keys': ('tipo_evento', 'event_type', 'evento'),
        'entity_key': 'dados',
        'event_map': {
            'INSCRICAO': ERPSyncEvent.EventType.STUDENT_ENROLLED,
            'DOCENTE': ERPSyncEvent.EventType.TEACHER_ASSIGNED,
            'BLOQUEIO_FINANCEIRO': ERPSyncEvent.EventType.TUITION_OVERDUE,
            'DESBLOQUEIO_FINANCEIRO': ERPSyncEvent.EventType.TUITION_SETTLED,
            'TRANSFERENCIA': ERPSyncEvent.EventType.ENROLLMENT_TRANSFERRED,
        },
        'fields': {
            'full_name': ('nome', 'nome_completo'),
            'bi_or_student_id': ('numero_processo', 'bi', 'bi_or_student_id'),
            'role': ('perfil', 'tipo', 'role'),
            'grade_class': ('classe', 'turma', 'grade_class'),
            'academic_year': ('ano_academico', 'ano_lectivo'),
            'phone': ('contacto', 'telefone'),
            'personal_email': ('email', 'email_pessoal'),
        },
    },
    'GENERIC': {
        'event_id_keys': ('event_id', 'id'),
        'event_type_keys': ('event_type', 'event'),
        'entity_key': 'user',
        'event_map': {e.value: e.value for e in ERPSyncEvent.EventType},
        'fields': {
            'full_name': ('full_name', 'nome_completo', 'name'),
            'bi_or_student_id': ('bi_or_student_id', 'bi', 'document_id'),
            'role': ('role', 'tipo'),
            'grade_class': ('grade_class', 'turma', 'class_name'),
            'academic_year': ('academic_year', 'ano_lectivo'),
            'phone': ('phone', 'telefone'),
            'personal_email': ('personal_email', 'email'),
        },
    },
}


def _first_present(mapping: dict, keys: tuple[str, ...], default: str = '') -> str:
    for k in keys:
        val = mapping.get(k)
        if val is not None and str(val).strip() != '':
            return str(val).strip()
    return default


def verify_erp_signature(secret: str, raw_body: bytes, signature_header: str) -> bool:
    """Valida a assinatura HMAC-SHA256 enviada no cabeçalho X-YetuEdu-Signature."""
    if not secret or not signature_header:
        return False
    provided = signature_header.strip()
    if provided.lower().startswith('sha256='):
        provided = provided[7:].strip()
    expected = hmac.new(secret.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected.lower(), provided.lower())


def parse_erp_payload(provider: str, payload: dict) -> CanonicalERPEvent:
    """Converte o JSON específico do ERP (KLASSE, SysPortal, Kacennu, Generic) em evento canónico."""
    if not isinstance(payload, dict):
        raise ERPAdapterError('O payload do webhook deve ser um objeto JSON.')

    schema = PROVIDER_SCHEMAS.get(provider.upper())
    if not schema:
        raise ERPAdapterError(f'Provedor ERP não suportado: {provider}')

    raw_event_type = _first_present(payload, schema['event_type_keys'])
    canonical_type = schema['event_map'].get(raw_event_type) or schema['event_map'].get(raw_event_type.lower())
    if not canonical_type and raw_event_type in {e.value for e in ERPSyncEvent.EventType}:
        canonical_type = raw_event_type
    if not canonical_type:
        raise ERPAdapterError(f"Tipo de evento '{raw_event_type}' não mapeado para {provider}.")

    entity = payload.get(schema['entity_key'])
    if not isinstance(entity, dict):
        entity = payload

    fields = schema['fields']
    bi_or_id = _first_present(entity, fields['bi_or_student_id'])
    full_name = _first_present(entity, fields['full_name'])

    if not bi_or_id:
        raise ERPAdapterError('Identificador do utilizador (BI ou n.º de processo) em falta no payload.')
    if canonical_type in (ERPSyncEvent.EventType.STUDENT_ENROLLED, ERPSyncEvent.EventType.TEACHER_ASSIGNED) and not full_name:
        raise ERPAdapterError('Nome completo obrigatório para matrícula ou atribuição de docente.')

    role_raw = _first_present(entity, fields['role'], 'STUDENT').upper()
    if canonical_type == ERPSyncEvent.EventType.TEACHER_ASSIGNED or any(x in role_raw for x in ('PROF', 'DOCENT', 'TEACH')):
        role = AcademicUser.Role.TEACHER
    elif any(x in role_raw for x in ('ADMIN', 'STAFF', 'SECRET')):
        role = AcademicUser.Role.STAFF
    else:
        role = AcademicUser.Role.STUDENT

    return CanonicalERPEvent(
        event_id=_first_present(payload, schema['event_id_keys']),
        event_type=canonical_type,
        full_name=full_name,
        bi_or_student_id=bi_or_id,
        role=role,
        grade_class=_first_present(entity, fields['grade_class'], 'Geral'),
        academic_year=_first_present(entity, fields['academic_year'], '2026/2027'),
        phone=_first_present(entity, fields['phone']),
        personal_email=_first_present(entity, fields['personal_email']),
    )
