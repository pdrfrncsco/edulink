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
