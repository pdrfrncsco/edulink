from django.utils import timezone
from django.utils.html import escape

from apps.compliance.models import APDDossier, ParentalConsent
from apps.directory.models import AcademicUser
from apps.tenants.models import CloudIntegration, School

DEFAULT_DATA_CATEGORIES = [
    'Nome Completo do Estudante / Docente',
    'Número do Bilhete de Identidade (BI) ou Processo Interno',
    'Endereço de Correio Eletrónico Institucional (.edu.ao)',
    'Ano Lectivo, Classe / Turma e Estado de Matrícula',
    'Contacto Telefónico / E-mail do Encarregado de Educação (quando aplicável)',
]

PROVIDER_TRANSFER_MAP = {
    CloudIntegration.Provider.GOOGLE: 'Google Workspace for Education (Google LLC / Irlanda & EUA)',
    CloudIntegration.Provider.MICROSOFT: 'Microsoft 365 Education A1 / Entra ID (Microsoft Corp. / UE & EUA)',
}


def build_apd_dossier_payload(dossier: APDDossier) -> dict:
    """
    Constrói o Dossiê Técnico-Jurídico de Notificação / Autorização Prévia
    junto da Agência de Protecção de Dados (APD - República de Angola)
    ao abrigo da Lei n.º 22/11 de 17 de Junho.
    """
    school = dossier.school
    integrations = list(
        CloudIntegration.objects.filter(school=school, sync_enabled=True).values_list('provider', flat=True)
    )
    transfer_providers = [PROVIDER_TRANSFER_MAP[p] for p in integrations if p in PROVIDER_TRANSFER_MAP]
    if not transfer_providers and dossier.international_transfer_providers:
        transfer_providers = list(dossier.international_transfer_providers)

    students_count = AcademicUser.objects.filter(school=school, role=AcademicUser.Role.STUDENT).count()
    teachers_count = AcademicUser.objects.filter(school=school, role=AcademicUser.Role.TEACHER).count()

    consents_qs = ParentalConsent.objects.filter(school=school)
    consent_summary = {
        'total': consents_qs.count(),
        'signed': consents_qs.filter(status=ParentalConsent.Status.SIGNED).count(),
        'pending': consents_qs.filter(status=ParentalConsent.Status.PENDING).count(),
        'revoked': consents_qs.filter(status=ParentalConsent.Status.REVOKED).count(),
    }

    requires_prior_auth = bool(transfer_providers) or dossier.has_minors
    submission_type = (
        APDDossier.SubmissionType.PRIOR_AUTHORIZATION
        if requires_prior_auth
        else APDDossier.SubmissionType.NOTIFICATION
    )

    data_categories = dossier.data_categories or DEFAULT_DATA_CATEGORIES

    return {
        'legal_framework': {
            'law': 'Lei n.º 22/11, de 17 de Junho (Lei da Protecção de Dados Pessoais de Angola)',
            'authority': 'Agência de Protecção de Dados (APD)',
            'regime': submission_type,
            'legal_basis': [
                'Consentimento explícito do Encarregado de Educação (para estudantes menores)',
                'Execução do contrato de prestação de serviços educativos / matrícula',
                'Transferência internacional sujeita a autorização prévia da APD (Art.º 33.º e 34.º)',
            ],
        },
        'data_controller': {
            'institution_name': school.name,
            'nif': school.nif,
            'alvara_med_mescti': school.alvara_med_mescti,
            'domain': school.domain,
            'address': f"{school.address}, {school.municipality}, {school.province}".strip(', '),
            'contact_email': school.contact_email,
            'phone': school.phone,
            'legal_representative': {
                'full_name': dossier.director_full_name,
                'bi_number': dossier.director_bi,
            },
            'privacy_focal_point': {
                'name': dossier.dpo_name or dossier.director_full_name,
                'email': dossier.dpo_email or school.contact_email,
            },
        },
        'data_processor': {
            'entity': 'EduLink — Plataforma SaaS de Identidade Académica',
            'architecture': 'Isolamento lógico multi-tenant por school_id (PostgreSQL)',
            'security_controls': [
                'Criptografia AES-256 / Fernet para credenciais de integração em nuvem',
                'Assinatura criptográfica JWT (HS256) para Passaporte Académico Digital',
                'Comunicação cifrada via TLS/HTTPS em todos os domínios .edu.ao',
                'Revogação automática de acessos cloud e QR Code aquando da suspensão de matrícula',
                'Registo auditável imutável de provisionamento (ProvisioningLog)',
            ],
        },
        'processing_details': {
            'purpose': 'Gestão do directório escolar, emissão de contas académicas .edu.ao, acesso a plataformas educativas (Google/Microsoft) e emissão de Cartão Académico Digital verificável.',
            'institution_type': dossier.institution_type,
            'has_minors': dossier.has_minors,
            'data_subjects': {
                'students': students_count,
                'teachers': teachers_count,
                'total': students_count + teachers_count,
            },
            'data_categories': data_categories,
            'retention_years': dossier.retention_years,
            'international_transfers': transfer_providers,
        },
        'parental_consent_status': consent_summary,
        'submission_checklist': [
            f'Formulário oficial da APD preenchido ({submission_type})',
            f'Cópia do Cartão de Contribuinte (NIF: {school.nif})',
            f'Cópia do Alvará MED / MESCTI ({school.alvara_med_mescti})',
            f'Cópia do BI do Diretor / Representante Legal ({dossier.director_bi})',
            'Minuta do Termo de Consentimento Informado dos Encarregados de Educação',
            'Comprovativo de pagamento da taxa de registo APD (4.315 Kz a 350.450 Kz conforme tabela oficial)',
        ],
        'generated_at': timezone.now().isoformat(),
    }


def generate_and_save_apd_dossier(dossier: APDDossier) -> dict:
    """Atualiza o snapshot do dossiê e promove para pronto para submissão."""
    payload = build_apd_dossier_payload(dossier)
    dossier.international_transfer_providers = payload['processing_details']['international_transfers']
    if not dossier.data_categories:
        dossier.data_categories = payload['processing_details']['data_categories']
    dossier.submission_type = payload['legal_framework']['regime']
    dossier.generated_payload = payload
    if dossier.status == APDDossier.Status.DRAFT:
        dossier.status = APDDossier.Status.READY_FOR_SUBMISSION
    dossier.save()
    return payload


def bulk_create_parental_consents(school: School, include_all_students: bool = True) -> dict:
    """Gera termos de consentimento parental pendentes para todos os estudantes da escola."""
    students = AcademicUser.objects.filter(school=school, role=AcademicUser.Role.STUDENT, is_active=True)
    if not include_all_students:
        students = students.filter(parental_consents__isnull=True)

    created_count = 0
    existing_count = 0
    for student in students:
        _, created = ParentalConsent.objects.get_or_create(
            school=school,
            student=student,
            defaults={'is_minor': True, 'status': ParentalConsent.Status.PENDING},
        )
        if created:
            created_count += 1
        else:
            existing_count += 1

    return {'created': created_count, 'existing': existing_count, 'total_students': students.count()}


def render_apd_dossier_html(dossier: APDDossier) -> str:
    """Renderiza o Dossiê APD em HTML imprimível (A4) com escape seguro contra XSS."""
    payload = dossier.generated_payload or generate_and_save_apd_dossier(dossier)
    ctrl = payload['data_controller']
    proc = payload['processing_details']
    rep = ctrl['legal_representative']

    categories_html = ''.join(f"<li>{escape(str(item))}</li>" for item in proc.get('data_categories', []))
    transfers_html = ''.join(
        f"<li>{escape(str(item))}</li>" for item in proc.get('international_transfers', [])
    ) or '<li>Sem transferência internacional configurada.</li>'
    controls_html = ''.join(
        f"<li>{escape(str(item))}</li>" for item in payload['data_processor'].get('security_controls', [])
    )
    checklist_html = ''.join(f"<li>{escape(str(item))}</li>" for item in payload.get('submission_checklist', []))

    return f"""<!DOCTYPE html>
<html lang="pt-AO">
<head>
  <meta charset="utf-8" />
  <title>Dossiê APD (Lei n.º 22/11) — {escape(ctrl['institution_name'])}</title>
  <style>
    body {{ font-family: Arial, Helvetica, sans-serif; color: #1c1917; max-width: 820px; margin: 32px auto; line-height: 1.5; font-size: 13px; }}
    h1 {{ font-size: 20px; color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 8px; }}
    h2 {{ font-size: 15px; color: #115e59; margin-top: 22px; }}
    .meta {{ background: #f5f5f4; padding: 12px 16px; border-radius: 8px; border: 1px solid #d6d3d1; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
    td, th {{ border: 1px solid #d6d3d1; padding: 8px 10px; text-align: left; }}
    th {{ background: #f0fdfa; width: 34%; }}
    .footer {{ margin-top: 32px; font-size: 11px; color: #57534e; border-top: 1px solid #d6d3d1; padding-top: 10px; }}
    @media print {{ body {{ margin: 12mm; }} }}
  </style>
</head>
<body>
  <h1>Dossiê de Conformidade — Agência de Protecção de Dados (APD)</h1>
  <div class="meta">
    <strong>Enquadramento Legal:</strong> {escape(payload['legal_framework']['law'])}<br />
    <strong>Regime Aplicável:</strong> {escape(payload['legal_framework']['regime'])}<br />
    <strong>Estado do Dossiê:</strong> {escape(dossier.get_status_display())}
    {f" | <strong>N.º Processo APD:</strong> {escape(dossier.apd_reference_number)}" if dossier.apd_reference_number else ""}
  </div>

  <h2>1. Identificação do Responsável pelo Tratamento</h2>
  <table>
    <tr><th>Instituição de Ensino</th><td>{escape(ctrl['institution_name'])}</td></tr>
    <tr><th>NIF / Alvará</th><td>NIF: {escape(ctrl['nif'])} | {escape(ctrl['alvara_med_mescti'])}</td></tr>
    <tr><th>Domínio Oficial</th><td>{escape(ctrl['domain'])}</td></tr>
    <tr><th>Endereço</th><td>{escape(ctrl['address'])}</td></tr>
    <tr><th>Representante Legal</th><td>{escape(rep['full_name'])} (BI: {escape(rep['bi_number'])})</td></tr>
    <tr><th>Ponto Focal de Privacidade</th><td>{escape(ctrl['privacy_focal_point']['name'])} ({escape(ctrl['privacy_focal_point']['email'])})</td></tr>
  </table>

  <h2>2. Finalidade, Titulares e Categorias de Dados</h2>
  <p>{escape(proc['purpose'])}</p>
  <p><strong>Titulares registados:</strong> {proc['data_subjects']['students']} estudantes e {proc['data_subjects']['teachers']} docentes. <strong>Prazo de conservação:</strong> {proc['retention_years']} anos após término do vínculo.</p>
  <ul>{categories_html}</ul>

  <h2>3. Transferência Internacional de Dados (Art.º 33.º e 34.º)</h2>
  <ul>{transfers_html}</ul>

  <h2>4. Medidas Técnicas e Organizativas (Subcontratante EduLink)</h2>
  <ul>{controls_html}</ul>

  <h2>5. Checklist de Documentos para Protocolo na APD</h2>
  <ul>{checklist_html}</ul>

  <div class="footer">
    Documento gerado automaticamente pela infraestrutura EduLink Angola em {escape(payload['generated_at'])}.
  </div>
</body>
</html>"""


def render_parental_consent_html(consent: ParentalConsent) -> str:
    """Renderiza o Termo de Consentimento Parental imprimível em HTML seguro."""
    school = consent.school
    student = consent.student
    scope = consent.consent_scope or {}
    signed_block = (
        f"Assinado digitalmente por <strong>{escape(consent.guardian_full_name)}</strong> "
        f"(BI: {escape(consent.guardian_bi)}) em {escape(consent.signed_at.isoformat())} "
        f"(IP: {escape(consent.signed_ip or 'N/A')})."
        if consent.status == ParentalConsent.Status.SIGNED and consent.signed_at
        else "Aguardando assinatura do Encarregado de Educação."
    )

    return f"""<!DOCTYPE html>
<html lang="pt-AO">
<head>
  <meta charset="utf-8" />
  <title>Termo de Consentimento Parental — {escape(student.full_name)}</title>
  <style>
    body {{ font-family: Arial, Helvetica, sans-serif; color: #1c1917; max-width: 780px; margin: 32px auto; line-height: 1.55; font-size: 13px; }}
    h1 {{ font-size: 19px; color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 8px; }}
    .box {{ background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin: 16px 0; }}
    .sig {{ margin-top: 36px; border-top: 1px dashed #78716c; padding-top: 12px; }}
  </style>
</head>
<body>
  <h1>Termo de Consentimento Informado — Protecção de Dados de Menores (Lei n.º 22/11)</h1>
  <p><strong>Instituição de Ensino:</strong> {escape(school.name)} (NIF: {escape(school.nif)} | Domínio: {escape(school.domain)})</p>

  <div class="box">
    <strong>Estudante:</strong> {escape(student.full_name)}<br />
    <strong>BI / Processo:</strong> {escape(student.bi_or_student_id)}<br />
    <strong>E-mail Institucional Atribuído:</strong> {escape(student.institutional_email)}
  </div>

  <p>Nos termos da <strong>Lei n.º 22/11 (Lei da Protecção de Dados Pessoais de Angola)</strong>, eu,
  <strong>{escape(consent.guardian_full_name or '____________________________________')}</strong>,
  portador(a) do Bilhete de Identidade n.º <strong>{escape(consent.guardian_bi or '__________________')}</strong>,
  na qualidade de <strong>{escape(consent.get_guardian_relationship_display())}</strong>, autorizo a instituição acima identificada e a plataforma tecnológica EduLink a proceder ao tratamento dos dados estritamente necessários para:</p>

  <ul>
    <li>Emissão e gestão da conta institucional <code>.edu.ao</code>: <strong>{'Sim' if scope.get('institutional_email', True) else 'Não'}</strong></li>
    <li>Acesso às ferramentas pedagógicas Google Workspace / Microsoft 365 / Canva: <strong>{'Sim' if scope.get('cloud_classroom', True) else 'Não'}</strong></li>
    <li>Emissão do Cartão Académico Digital verificável (QR Code): <strong>{'Sim' if scope.get('digital_passport_qr', True) else 'Não'}</strong></li>
    <li>Transferência internacional segura para servidores educativos acreditados: <strong>{'Sim' if scope.get('international_transfer', True) else 'Não'}</strong></li>
  </ul>

  <p>O encarregado de educação poderá exercer os direitos de acesso, retificação, oposição ou revogação do consentimento a qualquer momento junto da secretaria da escola ({escape(school.contact_email)}).</p>

  <div class="sig">
    <strong>Estado:</strong> {escape(consent.get_status_display())}<br />
    {signed_block}
  </div>
</body>
</html>"""
