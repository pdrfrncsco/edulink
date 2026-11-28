export interface AcademicUser {
  id: string;
  school: string;
  full_name: string;
  role: 'STUDENT' | 'TEACHER' | 'STAFF';
  institutional_email: string;
  bi_or_student_id: string;
  external_google_id: string | null;
  external_ms_id: string | null;
  is_active: boolean;
  active_enrollment: {
    id: string;
    academic_year: string;
    grade_class: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'TRANSFERRED' | 'GRADUATED';
  } | null;
}
