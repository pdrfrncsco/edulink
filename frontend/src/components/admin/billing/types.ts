import type { CommercialPlan, KwanzaPayment, SchoolSubscription } from '../types';

export type ExtendedPlan = CommercialPlan & {
  billing_type?: 'ONE_TIME' | 'ANNUAL';
};

export type ExtendedSubscription = SchoolSubscription & {
  billing_type?: 'ONE_TIME' | 'ANNUAL';
  status_label?: string;
};

export type ExtendedPayment = KwanzaPayment & {
  status_label?: string;
  sandbox_confirm_allowed?: boolean;
};

export type SubTab = 'billing' | 'invoices' | 'benefits';
export type PayMethod = 'MULTICAIXA_EXPRESS' | 'KWIK' | 'BANK_TRANSFER';

export const PAY_METHOD_SHORT: Record<PayMethod, string> = {
  MULTICAIXA_EXPRESS: 'MCX',
  KWIK: 'KWiK',
  BANK_TRANSFER: 'IBAN',
};
