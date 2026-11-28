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
