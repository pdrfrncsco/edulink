export { copyTextSafely } from '@/lib/clipboard';
export { buildCloudApps, buildGlobalPerks } from './cloudAppsCatalog';

export const OFFLINE_PASSPORT_KEY = 'edulink_offline_passport_cache';
export const KEYCLOAK_ACCOUNT_URL =
  process.env.NEXT_PUBLIC_KEYCLOAK_ACCOUNT_URL ||
  'https://auth.edulink.ao/realms/edulink/account';

export type PortalTab = 'card' | 'apps' | 'benefits' | 'account';
export type PaymentChannel = 'MULTICAIXA_EXPRESS' | 'KWIK';

export interface PassportData {
  fullName: string;
  role: string;
  institutionalEmail: string;
  schoolName: string;
  schoolDomain: string;
  schoolPrimaryColor: string;
  schoolLogoUrl?: string | null;
  institutionType: 'MED_K12' | 'MESCTI_HIGHER_ED';
  biNumber: string;
  gradeClass: string;
  academicYear: string;
  status: string;
  token: string;
  tokenExpiresAt: number | null;
  verificationUrl: string;
}

export interface CatalogOffer {
  id: string;
  partner_name: string;
  partner_category: string;
  partner_discount: string;
  title: string;
  promo_code: string;
  price_aoa: string;
}

export interface CloudAppItem {
  name: string;
  subtitle: string;
  href: string;
  badge: string;
  available: boolean;
}

export interface GlobalPerkItem {
  name: string;
  desc: string;
  href: string;
  badge?: string;
}

export class AuthSessionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthSessionError';
    this.status = status;
  }
}

export function isNetworkFailure(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (err instanceof AuthSessionError) return false;
  return err instanceof TypeError;
}

/** Reads and validates the offline passport cache, purging mismatched or corrupted entries. */
export function readCachedPassport(expectedInstitutionalEmail?: string): PassportData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OFFLINE_PASSPORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PassportData>;
    if (
      !parsed.token ||
      !parsed.verificationUrl ||
      !parsed.fullName ||
      !parsed.institutionalEmail
    ) {
      localStorage.removeItem(OFFLINE_PASSPORT_KEY);
      return null;
    }
    if (
      expectedInstitutionalEmail &&
      parsed.institutionalEmail.toLowerCase() !== expectedInstitutionalEmail.toLowerCase()
    ) {
      localStorage.removeItem(OFFLINE_PASSPORT_KEY);
      return null;
    }
    return parsed as PassportData;
  } catch {
    localStorage.removeItem(OFFLINE_PASSPORT_KEY);
    return null;
  }
}

export function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
