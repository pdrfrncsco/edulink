from django.db import transaction
from django.utils import timezone

from apps.directory.models import AcademicUser, Enrollment
from apps.directory.services.csv_importer import generate_institutional_email
from apps.erp_sync.models import ERPConnection, ERPSyncEvent
from apps.erp_sync.services.adapters import ERPAdapterError, parse_erp_payload


def process_erp_event(event_record: ERPSyncEvent) -> ERPSyncEvent:
    """
    Executa a transição de matrícula / utilizador no directório escolar.
    Ao alterar Enrollment.status para SUSPENDED ou ACTIVE, os sinais de ciclo
    de vida disparam automaticamente a revogação ou reativação Google/Microsoft/Keycloak.
    """
    connection = event_record.connection
    school = event_record.school

    try:
        canonical = parse_erp_payload(event_record.provider, event_record.payload)
    except ERPAdapterError as exc:
        event_record.processing_status = ERPSyncEvent.ProcessingStatus.FAILED
        event_record.detail = str(exc)
        event_record.processed_at = timezone.now()
        event_record.save(update_fields=['processing_status', 'detail', 'processed_at'])
        connection.last_sync_status = ERPConnection.SyncStatus.ERROR
        connection.last_error = str(exc)
        connection.save(update_fields=['last_sync_status', 'last_error'])
        return event_record

    with transaction.atomic():
        user = AcademicUser.objects.filter(school=school, bi_or_student_id=canonical.bi_or_student_id).first()

        if canonical.event_type in (
            ERPSyncEvent.EventType.STUDENT_ENROLLED,
            ERPSyncEvent.EventType.TEACHER_ASSIGNED,
        ):
            if user:
                user.full_name = canonical.full_name
                user.role = canonical.role
                if canonical.phone:
                    user.phone = canonical.phone
                if canonical.personal_email and '@' in canonical.personal_email:
                    user.personal_email = canonical.personal_email
                user.is_active = True
                user.save()
            else:
                email = generate_institutional_email(canonical.full_name, school.domain, school)
                user = AcademicUser.objects.create(
                    school=school,
                    full_name=canonical.full_name,
                    role=canonical.role,
                    institutional_email=email,
                    bi_or_student_id=canonical.bi_or_student_id,
                    phone=canonical.phone,
                    personal_email=canonical.personal_email if '@' in canonical.personal_email else None,
                    is_active=True,
                )

            enrollment, created = Enrollment.objects.get_or_create(
                user=user,
                school=school,
                academic_year=canonical.academic_year,
                defaults={'grade_class': canonical.grade_class, 'status': Enrollment.Status.ACTIVE},
            )
            if not created:
                enrollment.grade_class = canonical.grade_class
                enrollment.status = Enrollment.Status.ACTIVE
                enrollment.save()
            detail_msg = f"Matrícula ativa para {user.institutional_email} ({enrollment.grade_class})."
        else:
            if not user:
                event_record.processing_status = ERPSyncEvent.ProcessingStatus.FAILED
                event_record.detail = f"Utilizador com BI/Processo '{canonical.bi_or_student_id}' não encontrado na escola."
                event_record.processed_at = timezone.now()
                event_record.save(update_fields=['processing_status', 'detail', 'processed_at'])
                return event_record

            enrollment = Enrollment.objects.filter(
                user=user, school=school, academic_year=canonical.academic_year
            ).order_by('-created_at').first() or user.enrollments.order_by('-created_at').first()

            if not enrollment:
                enrollment = Enrollment.objects.create(
                    user=user,
                    school=school,
                    academic_year=canonical.academic_year,
                    grade_class=canonical.grade_class,
                    status=Enrollment.Status.ACTIVE,
                )

            if canonical.event_type == ERPSyncEvent.EventType.TUITION_OVERDUE:
                enrollment.status = Enrollment.Status.SUSPENDED
                enrollment.save()
                detail_msg = f"Matrícula de {user.institutional_email} suspensa por propina em atraso."
            elif canonical.event_type == ERPSyncEvent.EventType.TUITION_SETTLED:
                enrollment.status = Enrollment.Status.ACTIVE
                enrollment.save()
                detail_msg = f"Matrícula de {user.institutional_email} reativada após regularização."
            else:
                enrollment.status = Enrollment.Status.TRANSFERRED
                enrollment.save()
                detail_msg = f"Matrícula de {user.institutional_email} marcada como transferida."

        now = timezone.now()
        event_record.event_type = canonical.event_type
        event_record.affected_user = user
        event_record.processing_status = ERPSyncEvent.ProcessingStatus.PROCESSED
        event_record.detail = detail_msg
        event_record.processed_at = now
        event_record.save()

        connection.last_event_at = now
        connection.last_sync_status = ERPConnection.SyncStatus.SUCCESS
        connection.last_error = ''
        connection.save(update_fields=['last_event_at', 'last_sync_status', 'last_error'])

    return event_record
