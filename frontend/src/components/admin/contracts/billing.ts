export interface BenefitPartner {
  id: string;
  name: string;
  category: 'TELECOM' | 'BOOKSTORE' | 'SOFTWARE' | 'BANKING' | 'TRANSPORT_CULTURE';
  description: string;
  discount_label: string;
  eligible_roles: string[];
  website_url: string;
  is_active: boolean;
  has_api_key: boolean;
}

export interface BenefitOffer {
  id: string;
  partner: string;
  partner_name: string;
  partner_category: string;
  partner_discount: string;
  eligible_roles: string[];
  title: string;
  promo_code: string;
  price_aoa: string;
  requires_active_enrollment: boolean;
  is_active: boolean;
}

export interface CommercialPlan {
  code: 'SETUP_DIGITAL' | 'ESSENCIAL' | 'PRO' | 'CAMPUS';
  label: string;
  price_aoa: string;
  duration_days: number;
  max_users: number;
}

export interface SchoolSubscription {
  id: string;
  school: string;
  school_name: string;
  plan_code: CommercialPlan['code'];
  plan_label: string;
  annual_price_aoa: string;
  status: 'TRIAL' | 'PENDING_PAYMENT' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  starts_at: string | null;
  expires_at: string | null;
  auto_renew: boolean;
  created_at: string;
}

export interface KwanzaPayment {
  id: string;
  school: string | null;
  school_name?: string;
  subscription: string | null;
  benefit_offer: string | null;
  reference: string;
  payment_method: 'MULTICAIXA_EXPRESS' | 'KWIK' | 'BANK_TRANSFER';
  method_label: string;
  amount_aoa: string;
  currency: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
  customer_phone: string;
  customer_name: string;
  description: string;
  confirmed_at: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
  created_at: string;
}

export interface AGTInvoice {
  id: string;
  school: string | null;
  school_name?: string;
  payment: string;
  payment_reference: string;
  invoice_number: string;
  issue_date: string;
  customer_name: string;
  customer_nif: string;
  subtotal_aoa: string;
  iva_rate: string;
  iva_amount_aoa: string;
  total_aoa: string;
  previous_hash: string;
  agt_hash: string;
  hash_control: string;
  software_certificate_no: string;
  qr_payload: string;
}
