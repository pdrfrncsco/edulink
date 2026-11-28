import { getDisplayRootDomain } from '@/lib/siteUrls';

export type InstitutionType = 'MED_K12' | 'MESCTI_HIGHER_ED';
export type DocKey = 'ALVARA_MED_MESCTI' | 'NIF_CARD' | 'DIRECTOR_BI' | 'TECHNICAL_MANDATE';

export interface OnboardingFormState {
  name: string;
  institution_type: InstitutionType;
  nif: string;
  alvara_med_mescti: string;
  preview_slug: string;
  domain: string;
  director_external_email: string;
  contact_email: string;
  phone: string;
  province: string;
  municipality: string;
  address: string;
  primary_color: string;
  logo_url: string;
  about_text: string;
}

export const ROOT_DOMAIN = getDisplayRootDomain();

export const ANGOLA_PROVINCES: Record<string, string[]> = {
  Luanda: ['Talatona', 'Belas', 'Kilamba Kiaxi', 'Luanda', 'Cazenga', 'Viana', 'Cacuaco', 'Icolo e Bengo', 'Quiçama'],
  Benguela: ['Benguela', 'Lobito', 'Catumbela', 'Baía Farta', 'Ganda', 'Cubal'],
  Huíla: ['Lubango', 'Matala', 'Chibia', 'Humpata', 'Caconda'],
  Huambo: ['Huambo', 'Caála', 'Bailundo', 'Londuimbali'],
  Bié: ['Cuito', 'Andulo', 'Camacupa', 'Catabola'],
  Cabinda: ['Cabinda', 'Cacongo', 'Buco-Zau', 'Belize'],
  'Cuanza Sul': ['Sumbe', 'Porto Amboim', 'Gabela', 'Waku Kungo'],
  'Cuanza Norte': ['Ndalatando', 'Cambambe', 'Cazengo'],
  Uíge: ['Uíge', 'Negage', 'Maquela do Zombo'],
  Malanje: ['Malanje', 'Cacuso', 'Calandula'],
  Namibe: ['Moçâmedes', 'Tômbwa', 'Bibala'],
  Bengo: ['Caxito', 'Dande', 'Ambriz'],
  Cunene: ['Ondjiva', 'Cuanhama', 'Ombadja'],
  'Lunda Norte': ['Dundo', 'Chitato', 'Lucapa'],
  'Lunda Sul': ['Saurimo', 'Cacolo', 'Dala'],
  Moxico: ['Luena', 'Moxico', 'Camanongue'],
  Cuando: ['Mavinga', 'Menongue'],
  Zaire: ['Mbanza Kongo', 'Soyo', 'Nzeto'],
};

export const PROVINCE_LIST = Object.keys(ANGOLA_PROVINCES);

export const BRAND_COLORS = [
  { label: 'Verde EduLink', hex: '#0D9488' },
  { label: 'Azul Académico', hex: '#1D4ED8' },
  { label: 'Azul Marinho', hex: '#1E3A5F' },
  { label: 'Bordô Clássico', hex: '#991B1B' },
  { label: 'Dourado Escolar', hex: '#B45309' },
  { label: 'Verde Floresta', hex: '#15803D' },
];

export const REQUIRED_DOCS: { key: DocKey; label: string; helper: string; requiredForApproval: boolean }[] = [
  {
    key: 'ALVARA_MED_MESCTI',
    label: 'Alvará / Despacho MED ou MESCTI',
    helper: 'PDF ou foto legível do reconhecimento oficial do Estado.',
    requiredForApproval: true,
  },
  {
    key: 'NIF_CARD',
    label: 'Cartão de Contribuinte (NIF)',
    helper: 'Obrigatório para registo DNS.AO e faturação eletrónica AGT.',
    requiredForApproval: true,
  },
  {
    key: 'DIRECTOR_BI',
    label: 'BI do Diretor / Representante Legal',
    helper: 'Identificação do signatário responsável perante DNS.AO e APD.',
    requiredForApproval: true,
  },
  {
    key: 'TECHNICAL_MANDATE',
    label: 'Mandato Técnico Assinado (Opcional na demo)',
    helper: 'Autoriza a EduLink a gerir DNS, Google Workspace e Microsoft 365.',
    requiredForApproval: false,
  },
];

export const ONBOARDING_STEPS = [
  { id: 1, title: 'Identificação Legal', short: 'Legal' },
  { id: 2, title: 'Contactos & Documentos', short: 'Documentos' },
  { id: 3, title: 'Domínio & Marca', short: 'Domínio' },
  { id: 4, title: 'Pré-visualização & Envio', short: 'Revisão' },
];

export function slugifyHost(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function cleanDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0]
    .replace(/\.$/, '');
}
