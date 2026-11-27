import { headers } from 'next/headers';
import { getDisplayRootDomain, isLocalHost, stripHostPort } from './siteUrls';

const API_BASE =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://backend:8000/api/v1';

export interface PublicSchoolData {
  id: string;
  name: string;
  institution_type?: 'MED_K12' | 'MESCTI_HIGHER_ED';
  preview_slug?: string;
  domain?: string | null;
  effective_site_host?: string;
  is_canva_k12_eligible?: boolean;
  alvara_med_mescti: string;
  primary_color?: string;
  logo_url?: string | null;
  contact_email: string;
  phone?: string;
  province: string;
  municipality: string;
  address?: string;
  about_text?: string;
  apd_notified: boolean;
  apd_dossier_number?: string;
  is_active: boolean;
}

export async function getPublicSchoolData(domain: string): Promise<PublicSchoolData | null> {
  try {
    const res = await fetch(
      `${API_BASE}/tenants/by-domain/?domain=${encodeURIComponent(domain)}`,
      { next: { revalidate: 60 } }
    );
    if (res.status === 404) {
      return null;
    }
    if (res.ok) {
      return (await res.json()) as PublicSchoolData;
    }
  } catch (err) {
    console.error('Falha ao consultar escola por domínio:', err);
  }
  return null;
}

export interface SiteNavigationContext {
  portalUrl: string;
  adminUrl: string;
  privacyHref: string;
  homeHref: string;
  canonicalOrigin: string;
  isLocalRequest: boolean;
}

/**
 * Resolve os links internos de navegação de um site escolar (/sites/[domain])
 * adaptando-se ao modo localhost (/sites/...) vs subdomínio (*.localhost / produção).
 */
export async function getSiteNavigationContext(
  routeDomain: string,
  effectiveHost: string
): Promise<SiteNavigationContext> {
  const hdrs = await headers();
  const rawRequestHost = (
    hdrs.get('x-forwarded-host') ||
    hdrs.get('host') ||
    'localhost:3000'
  )
    .split(',')[0]
    .trim()
    .toLowerCase();

  const forwardedProto = (hdrs.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
  const isPathPreview = !hdrs.get('x-edulink-site-host');
  const isLocalRequest = isLocalHost(rawRequestHost);
  const rootDomain = getDisplayRootDomain();

  const encodedDomain = encodeURIComponent(routeDomain);
  const privacyHref = isPathPreview ? `/sites/${encodedDomain}/privacidade` : '/privacidade';
  const homeHref = isPathPreview ? `/sites/${encodedDomain}` : '/';

  if (isPathPreview && isLocalRequest) {
    const proto = forwardedProto || 'http';
    return {
      portalUrl: '/portal',
      adminUrl: '/admin',
      privacyHref,
      homeHref,
      canonicalOrigin: `${proto}://${rawRequestHost}/sites/${encodedDomain}`,
      isLocalRequest: true,
    };
  }

  if (isLocalRequest) {
    const hostnameOnly = stripHostPort(rawRequestHost);
    const portSuffix = rawRequestHost.includes(':') ? `:${rawRequestHost.split(':')[1]}` : '';
    const baseLocal = hostnameOnly.endsWith('.localhost')
      ? `localhost${portSuffix}`
      : rawRequestHost;
    return {
      portalUrl: `http://portal.${baseLocal}`,
      adminUrl: `http://admin.${baseLocal}`,
      privacyHref,
      homeHref,
      canonicalOrigin: `http://${rawRequestHost}`,
      isLocalRequest: true,
    };
  }

  return {
    portalUrl: process.env.NEXT_PUBLIC_PORTAL_URL || `https://portal.${rootDomain}`,
    adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL || `https://admin.${rootDomain}`,
    privacyHref,
    homeHref,
    canonicalOrigin: `https://${effectiveHost}`,
    isLocalRequest: false,
  };
}
