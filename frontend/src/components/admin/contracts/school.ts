export type SetupStage =
  | 'NOT_STARTED'
  | 'PENDING_DOCS'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'ACTION_REQUIRED'
  | 'NOT_ELIGIBLE';

export interface School {
  id: string;
  name: string;
  institution_type?: 'MED_K12' | 'MESCTI_HIGHER_ED';
  is_canva_k12_eligible?: boolean;
  nif: string;
  alvara_med_mescti: string;
  preview_slug?: string;
  domain: string | null;
  effective_site_host?: string;
  primary_color: string;
  logo_url?: string | null;
  contact_email: string;
  phone: string;
  province: string;
  municipality: string;
  address: string;
  about_text: string;
  is_active: boolean;
  apd_notified: boolean;
  apd_dossier_number: string;
  dns_status?: SetupStage;
  google_status?: SetupStage;
  microsoft_status?: SetupStage;
  canva_status?: SetupStage;
  documents_uploaded_count?: number;
  documents_approved_count?: number;
  enable_erp_sync?: boolean;
  enable_benefits_club?: boolean;
  enable_online_payments?: boolean;
  total_students?: number;
  total_teachers?: number;
  active_integrations?: string[];
}

export interface OnboardingDocumentItem {
  id: string;
  school: string;
  doc_type: 'ALVARA_MED_MESCTI' | 'NIF_CARD' | 'DIRECTOR_BI' | 'TECHNICAL_MANDATE' | 'APD_DOSSIER';
  doc_type_label: string;
  file: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  status_label: string;
  review_notes: string;
  verified_at: string | null;
  created_at: string;
}
