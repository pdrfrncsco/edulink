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

export function buildCloudApps(
  passport: PassportData | null,
  isTeacher: boolean,
  isCanvaFreeK12: boolean
): CloudAppItem[] {
  if (!passport) return [];
  const email = encodeURIComponent(passport.institutionalEmail);
  return [
    {
      name: 'Webmail Institucional',
      subtitle: passport.institutionalEmail,
      href: `https://mail.google.com/a/${passport.schoolDomain}`,
      badge: 'E-mail Oficial',
      available: true,
    },
    {
      name: isTeacher ? 'Google Classroom (Docente)' : 'Google Classroom & Drive',
      subtitle: isTeacher
        ? 'Gerir turmas, tarefas e Google Docs'
        : 'Aulas, cadernos e armazenamento em nuvem',
      href: `https://classroom.google.com/u/0/?authuser=${email}`,
      badge: 'Google Workspace',
      available: true,
    },
    {
      name: isTeacher ? 'Microsoft 365 (Faculty)' : 'Microsoft 365 & Teams',
      subtitle: 'Word, Excel, PowerPoint Web, Teams e OneDrive',
      href: `https://www.office.com/?login_hint=${email}`,
      badge: 'Office 365 A1',
      available: true,
    },
    {
      name: isCanvaFreeK12 ? 'Canva para Educação' : 'Canva para Universidades',
      subtitle: isCanvaFreeK12
        ? isTeacher
          ? 'Gratuito para docentes K-12 via conta da escola'
          : 'Design educativo gratuito com conta da escola'
        : 'Disponível mediante plano Canva Campus da IES',
      href: 'https://www.canva.com/education/',
      badge: isCanvaFreeK12 ? '100% Gratuito (K-12)' : 'Ensino Superior',
      available: isCanvaFreeK12,
    },
  ];
}

export function buildGlobalPerks(isTeacher: boolean): GlobalPerkItem[] {
  return isTeacher
    ? [
        {
          name: 'GitHub Global Campus (Docentes)',
          desc: 'Ferramentas gratuitas para ensino de programação e repositórios privados.',
          href: 'https://education.github.com/teachers',
        },
        {
          name: 'Figma for Education',
          desc: 'Plano Professional gratuito para salas de aula e projetos académicos.',
          href: 'https://www.figma.com/education/',
        },
        {
          name: 'JetBrains Educational Licenses',
          desc: 'IDEs profissionais gratuitas com o e-mail institucional.',
          href: 'https://www.jetbrains.com/community/education/',
        },
      ]
    : [
        {
          name: 'GitHub Student Developer Pack',
          desc: 'Créditos cloud, domínios e ferramentas de desenvolvimento gratuitas.',
          href: 'https://education.github.com/pack',
        },
        {
          name: 'Figma for Education',
          desc: 'Design UI/UX e FigJam gratuitos com verificação académica.',
          href: 'https://www.figma.com/education/',
        },
        {
          name: 'JetBrains & Spotify Estudante',
          desc: 'Use o seu e-mail institucional para solicitar elegibilidade académica.',
          href: 'https://www.jetbrains.com/community/education/',
        },
      ];
}

export function readCachedPassport(): PassportData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OFFLINE_PASSPORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PassportData>;
    if (!parsed.token || !parsed.verificationUrl || !parsed.fullName) return null;
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

export async function copyTextSafely(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback para navegadores móveis sem permissão clipboard
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
