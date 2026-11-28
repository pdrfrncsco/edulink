import type { StatusTone } from '@/components/ui';
import { getDisplayRootDomain } from '@/lib/siteUrls';
import type { School, SetupStage } from './types';

export type SectionKey =
  | 'platform_ops'
  | 'onboarding'
  | 'overview'
  | 'directory'
  | 'provisioning'
  | 'domains'
  | 'compliance'
  | 'billing_benefits'
  | 'erp_verifiers';

export const VALID_SECTIONS: SectionKey[] = [
  'platform_ops',
  'onboarding',
  'overview',
  'directory',
  'provisioning',
  'domains',
  'compliance',
  'billing_benefits',
  'erp_verifiers',
];

export function resolveEffectiveHost(school: School | null): string {
  if (!school) return '';
  if (school.effective_site_host) return school.effective_site_host;
  if (school.domain) return school.domain;
  if (school.preview_slug) return `${school.preview_slug}.${getDisplayRootDomain()}`;
  return '';
}

export function getSectionFromUrl(): SectionKey | null {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('section');
  return param && VALID_SECTIONS.includes(param as SectionKey) ? (param as SectionKey) : null;
}

export function syncSectionToUrl(section: SectionKey) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('section', section);
  window.history.replaceState({}, '', url.toString());
}

export interface NavItem {
  id: SectionKey;
  label: string;
  description: string;
  group: 'ops' | 'school';
  badge?: string;
}

export const STAGE_META: Record<SetupStage, { label: string; tone: StatusTone }> = {
  NOT_STARTED: { label: 'Por Iniciar', tone: 'neutral' },
  PENDING_DOCS: { label: 'Aguardando Docs', tone: 'warning' },
  SUBMITTED: { label: 'Em Revisão', tone: 'info' },
  APPROVED: { label: 'Ativo / Aprovado', tone: 'success' },
  ACTION_REQUIRED: { label: 'Ação Necessária', tone: 'error' },
  NOT_ELIGIBLE: { label: 'Plano IES (Pago)', tone: 'neutral' },
};

export function buildAdminNavItems(params: {
  isPlatformAdmin: boolean;
  surfaceMode: 'admin' | 'ops';
  hasSchool: boolean;
  erpFeatureEnabled: boolean;
}): NavItem[] {
  const { isPlatformAdmin, surfaceMode, hasSchool, erpFeatureEnabled } = params;

  if (!isPlatformAdmin && !hasSchool) {
    return [
      {
        id: 'onboarding',
        label: 'Registar Minha Escola',
        description: 'Configuração inicial e site institucional',
        group: 'school',
      },
    ];
  }

  const schoolItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Visão Geral',
      description: isPlatformAdmin
        ? 'Progresso DNS, Google, Microsoft, Canva e APD'
        : 'Resumo e progresso da ativação escolar',
      group: 'school',
    },
    {
      id: 'directory',
      label: isPlatformAdmin ? 'Directório & CSV' : 'Alunos & Docentes',
      description: 'Importação CSV e gestão de matrículas',
      group: 'school',
    },
    {
      id: 'provisioning',
      label: isPlatformAdmin ? 'Provisionamento Cloud' : 'Contas Google & MS',
      description: 'Google Workspace, Microsoft 365 e SSO',
      group: 'school',
    },
    {
      id: 'domains',
      label: isPlatformAdmin ? 'Domínio & Site' : 'Site & Domínio .edu.ao',
      description: 'DNS.AO, Cloudflare e site institucional',
      group: 'school',
    },
    {
      id: 'compliance',
      label: isPlatformAdmin ? 'Conformidade APD' : 'Proteção de Dados (APD)',
      description: 'Dossiê Lei n.º 22/11 e consentimentos',
      group: 'school',
    },
    {
      id: 'billing_benefits',
      label: isPlatformAdmin ? 'Faturação AGT & Clube' : 'Planos & Faturas AGT',
      description: 'Subscrição em Kwanzas e comprovativos AGT',
      group: 'school',
    },
  ];

  if (erpFeatureEnabled) {
    schoolItems.push({
      id: 'erp_verifiers',
      label: 'ERPs & Verificadores',
      description: 'Sincronização ERP e SheerID/GitHub',
      group: 'school',
      badge: isPlatformAdmin ? 'Fase 2' : undefined,
    });
  }

  if (isPlatformAdmin && surfaceMode === 'ops') {
    return [
      {
        id: 'platform_ops',
        label: 'Operação Global',
        description: 'Escolas, contas, documentos e estado da plataforma',
        group: 'ops',
      },
      {
        id: 'onboarding',
        label: 'Nova Escola',
        description: 'Wizard de registo e demo instantânea',
        group: 'ops',
      },
      ...schoolItems,
    ];
  }

  return schoolItems;
}
