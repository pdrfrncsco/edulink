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
