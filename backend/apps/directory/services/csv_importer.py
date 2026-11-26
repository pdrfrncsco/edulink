import csv
import io
import re
import unicodedata
from django.db import transaction
from apps.directory.models import AcademicUser, Enrollment
from apps.tenants.models import School


def remove_accents(text: str) -> str:
    """Remove acentos e caracteres diacríticos mantendo apenas letras ascii e hífens."""
    nfkd_form = unicodedata.normalize('NFKD', text)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])


def generate_institutional_email(full_name: str, school_domain: str, school: School, exclude_user_id=None) -> str:
    """
    Gera um endereço de e-mail institucional padronizado no formato:
    primeiro.ultimo@escola.edu.ao
    Lida com partículas (de, da, do, dos, das, e) e colisões numéricas.
    """
    cleaned = remove_accents(full_name.strip().lower())
    # Remove pontuações e caracteres especiais
    cleaned = re.sub(r'[^a-z\s-]', '', cleaned)
    tokens = [t for t in cleaned.split() if t]

    if not tokens:
        tokens = ['utilizador', 'academico']

    ignored_particles = {'de', 'da', 'do', 'dos', 'das', 'e'}
    significant_tokens = [t for t in tokens if t not in ignored_particles]

    if not significant_tokens:
        significant_tokens = tokens

    first_name = significant_tokens[0]
    last_name = significant_tokens[-1] if len(significant_tokens) > 1 else 'edu'

    base_local_part = f"{first_name}.{last_name}"
    candidate_email = f"{base_local_part}@{school_domain}"

    # Verificação de colisão
    qs = AcademicUser.objects.filter(school=school, institutional_email=candidate_email)
    if exclude_user_id:
        qs = qs.exclude(id=exclude_user_id)

    if not qs.exists():
        return candidate_email

    counter = 2
    while True:
        candidate_email = f"{base_local_part}{counter}@{school_domain}"
        qs = AcademicUser.objects.filter(school=school, institutional_email=candidate_email)
        if exclude_user_id:
            qs = qs.exclude(id=exclude_user_id)
        if not qs.exists():
            return candidate_email
        counter += 1


class CSVImporterService:
    """
    Serviço de importação em lote de estudantes e professores
    a partir de ficheiros CSV da secretaria escolar (Kacennu, KLASSE, SysPortal, Excel).
    """

    @classmethod
    def import_directory_csv(cls, school: School, file_content_or_stream, default_academic_year="2026/2027"):
        if isinstance(file_content_or_stream, bytes):
            # Tenta decodificar como UTF-8 com fallback para Latin-1 (comum em Windows/Excel)
            try:
                decoded = file_content_or_stream.decode('utf-8-sig')
            except UnicodeDecodeError:
                decoded = file_content_or_stream.decode('latin-1')
        elif isinstance(file_content_or_stream, str):
            decoded = file_content_or_stream
        else:
            decoded = file_content_or_stream.read()
            if isinstance(decoded, bytes):
                try:
                    decoded = decoded.decode('utf-8-sig')
                except UnicodeDecodeError:
                    decoded = decoded.decode('latin-1')

        # Detecta delimitador (, ou ;)
        sample = decoded[:2048]
        delimiter = ';' if sample.count(';') > sample.count(',') else ','

        reader = csv.DictReader(io.StringIO(decoded), delimiter=delimiter)
        
        # Normalização dos cabeçalhos esperados
        # Mapeamento flexível
        stats = {
            'total_rows': 0,
            'created_users': 0,
            'updated_users': 0,
            'created_enrollments': 0,
            'errors': []
        }

        with transaction.atomic():
            for row_idx, raw_row in enumerate(reader, start=2):
                stats['total_rows'] += 1
                
                # Normaliza as chaves do dicionário
                row = {
                    remove_accents(k.strip().lower().replace(' ', '_')): v.strip() 
                    for k, v in raw_row.items() if k
                }

                # Localiza campos com nomes alternativos
                full_name = (
                    row.get('nome_completo') or 
                    row.get('nome') or 
                    row.get('estudante') or 
                    row.get('aluno') or 
                    row.get('professor') or 
                    ''
                )
                bi_or_id = (
                    row.get('bi_ou_processo') or 
                    row.get('bi') or 
                    row.get('processo') or 
                    row.get('numero_processo') or 
                    row.get('nif') or 
                    ''
                )
                role_raw = (
                    row.get('papel') or 
                    row.get('tipo') or 
                    row.get('funcao') or 
                    row.get('role') or 
                    'STUDENT'
                ).upper()
                grade_class = (
                    row.get('classe_turma') or 
                    row.get('turma') or 
                    row.get('classe') or 
                    row.get('curso') or 
                    'Geral'
                )
                academic_year = (
                    row.get('ano_lectivo') or 
                    row.get('ano') or 
                    default_academic_year
                )
                phone = row.get('telefone') or row.get('telemovel') or ''
                personal_email = row.get('email_pessoal') or row.get('email') or None

                if not full_name:
                    stats['errors'].append(f"Linha {row_idx}: Nome não fornecido.")
                    continue

                if not bi_or_id:
                    # Gera um identificador provisório se for apenas teste
                    bi_or_id = f"PROC-{school.id.hex[:4].upper()}-{row_idx}"

                # Mapeia Papel
                if any(x in role_raw for x in ['PROF', 'DOCENT', 'TEACH']):
                    role = AcademicUser.Role.TEACHER
                elif any(x in role_raw for x in ['ADMIN', 'STAFF', 'SECRET']):
                    role = AcademicUser.Role.STAFF
                else:
                    role = AcademicUser.Role.STUDENT

                # Procura ou cria o AcademicUser
                user = AcademicUser.objects.filter(school=school, bi_or_student_id=bi_or_id).first()

                if user:
                    user.full_name = full_name
                    user.role = role
                    if phone:
                        user.phone = phone
                    if personal_email and '@' in personal_email:
                        user.personal_email = personal_email
                    user.save()
                    stats['updated_users'] += 1
                else:
                    inst_email = generate_institutional_email(full_name, school.domain, school)
                    user = AcademicUser.objects.create(
                        school=school,
                        full_name=full_name,
                        role=role,
                        bi_or_student_id=bi_or_id,
                        institutional_email=inst_email,
                        phone=phone,
                        personal_email=personal_email if (personal_email and '@' in personal_email) else None,
                        is_active=True
                    )
                    stats['created_users'] += 1

                # Cria ou atualiza a matrícula anual
                enrollment, created_enr = Enrollment.objects.get_or_create(
                    user=user,
                    school=school,
                    academic_year=academic_year,
                    defaults={
                        'grade_class': grade_class,
                        'status': Enrollment.Status.ACTIVE
                    }
                )
                if created_enr:
                    stats['created_enrollments'] += 1
                elif enrollment.grade_class != grade_class:
                    enrollment.grade_class = grade_class
                    enrollment.save()

        return stats
