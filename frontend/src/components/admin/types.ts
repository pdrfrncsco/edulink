import { API_BASE, authFetch } from '@/lib/auth';

export { API_BASE };

export interface School {
  id: string;
  name: string;
  nif: string;
  alvara_med_mescti: string;
  domain: string;
  primary_color: string;
  contact_email: string;
  phone: string;
  province: string;
  municipality: string;
  address: string;
  about_text: string;
  is_active: boolean;
  apd_notified: boolean;
  apd_dossier_number: string;
  total_students?: number;
  total_teachers?: number;
  active_integrations?: string[];
}

export interface CloudIntegration {
  id: string;
  school: string;
  provider: 'GOOGLE' | 'MICROSOFT';
  sync_enabled: boolean;
  sync_status: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  last_sync_at: string | null;
  last_error_message: string;
}

export interface ProvisioningLog {
  id: string;
  school: string;
  user: string | null;
  institutional_email: string | null;
  provider: 'GOOGLE' | 'MICROSOFT';
  action: 'PROVISION' | 'REACTIVATE' | 'SUSPEND' | 'TEST';
  status: 'SUCCESS' | 'SANDBOX' | 'FAILED';
  external_id: string;
  detail: string;
  created_at: string;
}

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

export interface DNSRecord {
  id: string;
  domain_config: string;
  record_type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT';
  name: string;
  content: string;
  ttl: number;
  priority: number | null;
  proxied: boolean;
  purpose: string;
  sync_state: 'PENDING' | 'SYNCED' | 'FAILED';
  propagated: boolean;
}

export interface DomainConfig {
  id: string;
  school: string;
  school_domain: string;
  school_name: string;
  registrar_status: 'PENDING_DNS_AO' | 'NAMESERVERS_DELEGATED' | 'ACTIVE' | 'ERROR';
  cloudflare_zone_id: string;
  cloudflare_account_id: string;
  nameservers: string[];
  google_verification_token: string;
  microsoft_verification_token: string;
  dkim_selector: string;
  dkim_public_key: string;
  target_web_ip_or_cname: string;
  last_synced_at: string | null;
  last_error: string;
  records: DNSRecord[];
}

export interface APDDossier {
  id: string;
  school: string;
  school_name: string;
  school_domain: string;
  director_full_name: string;
  director_bi: string;
  dpo_name: string;
  dpo_email: string;
  institution_type: 'PRIMARY_SECONDARY' | 'HIGHER_ED';
  has_minors: boolean;
  international_transfer_providers: string[];
  retention_years: number;
  submission_type: 'NOTIFICATION' | 'PRIOR_AUTHORIZATION';
  status: 'DRAFT' | 'READY_FOR_SUBMISSION' | 'SUBMITTED' | 'APPROVED';
  apd_reference_number: string;
  submitted_at: string | null;
  generated_payload: any;
}

export interface ParentalConsent {
  id: string;
  school: string;
  school_name: string;
  student: string;
  student_name: string;
  student_email: string;
  guardian_full_name: string;
  guardian_bi: string;
  guardian_relationship: 'PAI_MAE' | 'TUTOR_LEGAL' | 'ENCARREGADO';
  status: 'PENDING' | 'SIGNED' | 'REVOKED';
  consent_token: string;
  signed_at: string | null;
}

export interface ERPConnection {
  id: string;
  school: string;
  school_name: string;
  school_domain: string;
  provider: 'KLASSE' | 'SYSPORTAL' | 'KACENNU' | 'GENERIC';
  api_base_url: string;
  is_active: boolean;
  webhook_path: string;
  last_event_at: string | null;
  last_sync_status: 'IDLE' | 'SUCCESS' | 'ERROR';
  last_error: string;
}

export interface ERPSyncEvent {
  id: string;
  connection: string;
  provider: string;
  event_id: string;
  event_type: string;
  processing_status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'IGNORED';
  affected_user_email: string | null;
  detail: string;
  created_at: string;
}

export interface GlobalVerifierApp {
  id: string;
  school: string;
  school_name: string;
  school_domain: string;
  verifier: 'SHEERID' | 'UNIDAYS' | 'GITHUB_EDUCATION';
  status: 'NOT_STARTED' | 'DOSSIER_READY' | 'SUBMITTED' | 'APPROVED';
  official_website_url: string;
  submission_reference: string;
  readiness_snapshot: {
    checks?: Record<string, boolean>;
    ready_for_submission?: boolean;
  };
}

export interface FeedbackState {
  type: 'success' | 'error';
  message: string;
  details?: any;
}

export async function apiJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, init);
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }
  if (!res.ok) {
    throw new Error(data?.detail || data?.error || JSON.stringify(data) || `Erro HTTP ${res.status}`);
  }
  return data as T;
}
