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
  guardian_email?: string;
  status: 'PENDING' | 'SIGNED' | 'REVOKED';
  consent_token: string;
  signed_at: string | null;
}
