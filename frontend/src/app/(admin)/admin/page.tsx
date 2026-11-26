'use client';

import React, { useEffect, useMemo, useState } from 'react';
import BillingAndBenefitsTab from '@/components/admin/BillingAndBenefitsTab';
import ComplianceAPDTab from '@/components/admin/ComplianceAPDTab';
import DirectoryTab from '@/components/admin/DirectoryTab';
import DomainsDNSTab from '@/components/admin/DomainsDNSTab';
import ERPAndVerifiersTab from '@/components/admin/ERPAndVerifiersTab';
import OnboardingTab from '@/components/admin/OnboardingTab';
import PlatformOpsTab from '@/components/admin/PlatformOpsTab';
import ProvisioningTab from '@/components/admin/ProvisioningTab';
import SchoolSelectorBar from '@/components/admin/SchoolSelectorBar';
import { apiJson, FeedbackState, School } from '@/components/admin/types';
import AuthCard from '@/components/auth/AuthCard';
import {
  AuthUser,
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  updateStoredUser,
} from '@/lib/auth';

type SectionKey =
  | 'platform_ops'
  | 'onboarding'
  | 'overview'
  | 'directory'
  | 'provisioning'
  | 'domains'
  | 'compliance'
  | 'billing_benefits'
  | 'erp_verifiers';

type SetupStage =
  | 'NOT_STARTED'
  | 'PENDING_DOCS'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'ACTION_REQUIRED'
  | 'NOT_ELIGIBLE';

type ExtendedSchool = School & {
  preview_slug?: string;
  effective_site_host?: string;
  institution_type?: 'MED_K12' | 'MESCTI_HIGHER_ED';
  is_canva_k12_eligible?: boolean;
  primary_color?: string;
  logo_url?: string | null;
  dns_status?: SetupStage;
  google_status?: SetupStage;
  microsoft_status?: SetupStage;
  canva_status?: SetupStage;
  documents_uploaded_count?: number;
  documents_approved_count?: number;
  enable_erp_sync?: boolean;
  enable_benefits_club?: boolean;
  enable_online_payments?: boolean;
};

type ExtendedAuthUser = AuthUser & {
  enable_erp_sync?: boolean;
  enable_benefits_club?: boolean;
};

interface NavItem {
  id: SectionKey;
  label: string;
  description: string;
  group: 'ops' | 'school';
  badge?: string;
}

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'edulink.ao').toLowerCase();

const STAGE_STYLE: Record<SetupStage, { label: string; cls: string }> = {
  NOT_STARTED: { label: 'Por Iniciar', cls: 'bg-stone-100 text-stone-700 border-stone-200' },
  PENDING_DOCS: { label: 'Aguardando Docs', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  SUBMITTED: { label: 'Em Revisão', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  APPROVED: { label: 'Ativo / Aprovado', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  ACTION_REQUIRED: { label: 'Ação Necessária', cls: 'bg-red-50 text-red-800 border-red-200' },
  NOT_ELIGIBLE: { label: 'Plano IES (Pago)', cls: 'bg-stone-100 text-stone-600 border-stone-200' },
};

function resolveEffectiveHost(school: ExtendedSchool | null): string {
  if (!school) return '';
  if (school.effective_site_host) return school.effective_site_host;
  if (school.domain) return school.domain;
  if (school.preview_slug) return `${school.preview_slug}.${ROOT_DOMAIN}`;
  return '';
}

function getSectionFromUrl(): SectionKey | null {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('section');
  const valid: SectionKey[] = [
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
  return param && valid.includes(param as SectionKey) ? (param as SectionKey) : null;
}

function syncSectionToUrl(section: SectionKey) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('section', section);
  window.history.replaceState({}, '', url.toString());
}

export default function AdminPage() {
  const [authUser, setAuthUser] = useState<ExtendedAuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [schools, setSchools] = useState<ExtendedSchool[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const loadSchools = async (preferSchoolId?: string) => {
    try {
      const data = await apiJson<{ results?: ExtendedSchool[] } | ExtendedSchool[]>('/tenants/schools/');
      const list = Array.isArray(data) ? data : data.results || [];
      setSchools(list);
      if (preferSchoolId) {
        setSelectedSchoolId(preferSchoolId);
      } else if (list.length > 0) {
        setSelectedSchoolId((prev) => (prev && list.some((s) => s.id === prev) ? prev : list[0].id));
      }
    } catch (err: any) {
      if (String(err.message).includes('401')) {
        clearAuthSession();
        setAuthUser(null);
      }
    }
  };

  const pickDefaultSection = (user: ExtendedAuthUser): SectionKey => {
    const requested = getSectionFromUrl();
    if (user.role === 'PLATFORM_ADMIN') {
      return requested || 'platform_ops';
    }
    if (!user.school_id) {
      return 'onboarding';
    }
    if (requested && requested !== 'platform_ops' && requested !== 'onboarding') {
      return requested;
    }
    return 'overview';
  };

  const syncSession = async () => {
    const token = getAccessToken();
    const cached = getStoredUser() as ExtendedAuthUser | null;
    if (!token) {
      setAuthReady(true);
      return;
    }
    if (cached) setAuthUser(cached);

    try {
      const me = await apiJson<ExtendedAuthUser>('/auth/me/');
      setAuthUser(me);
      updateStoredUser(me);
      const initial = pickDefaultSection(me);
      setActiveSection(initial);
      await loadSchools(me.school_id || undefined);
    } catch {
      clearAuthSession();
      setAuthUser(null);
    } finally {
      setAuthReady(true);
    }
  };

  useEffect(() => {
    syncSession();
  }, []);

  const handleAuthenticated = async (user: AuthUser) => {
    const extended = user as ExtendedAuthUser;
    setAuthUser(extended);
    setFeedback(null);
    await loadSchools(extended.school_id || undefined);
    const nextSection = pickDefaultSection(extended);
    setActiveSection(nextSection);
    syncSectionToUrl(nextSection);
  };

  const handleLogout = () => {
    clearAuthSession();
    setAuthUser(null);
    setSchools([]);
    setSelectedSchoolId('');
    setFeedback(null);
    setMobileNavOpen(false);
  };

  const navigateTo = (section: SectionKey) => {
    setActiveSection(section);
    syncSectionToUrl(section);
    setMobileNavOpen(false);
  };

  const isPlatformAdmin = authUser?.role === 'PLATFORM_ADMIN';
  const activeSchool = useMemo(
    () => schools.find((s) => s.id === selectedSchoolId) || null,
    [schools, selectedSchoolId]
  );

  const hasSchool = Boolean(authUser?.school_id || selectedSchoolId);
  const erpFeatureEnabled = isPlatformAdmin || Boolean(activeSchool?.enable_erp_sync || authUser?.enable_erp_sync);
  const benefitsFeatureEnabled =
    isPlatformAdmin || Boolean(activeSchool?.enable_benefits_club || authUser?.enable_benefits_club);

  const navItems = useMemo<NavItem[]>(() => {
    if (isPlatformAdmin) {
      return [
        {
          id: 'platform_ops',
          label: 'Operação Global',
          description: 'Escolas, contas e estado da plataforma',
          group: 'ops',
        },
        {
          id: 'onboarding',
          label: 'Nova Escola',
          description: 'Wizard de registo e demo instantânea',
          group: 'ops',
        },
        {
          id: 'overview',
          label: 'Visão Geral',
          description: 'Progresso DNS, Google, Microsoft, Canva e APD',
          group: 'school',
        },
        {
          id: 'directory',
          label: 'Directório & CSV',
          description: 'Estudantes, docentes e turmas',
          group: 'school',
        },
        {
          id: 'provisioning',
          label: 'Provisionamento Cloud',
          description: 'Google Workspace, Microsoft 365 e SSO',
          group: 'school',
        },
        {
          id: 'domains',
          label: 'Domínio & Site',
          description: 'DNS.AO, Cloudflare e site institucional',
          group: 'school',
        },
        {
          id: 'compliance',
          label: 'Conformidade APD',
          description: 'Dossiê Lei n.º 22/11 e consentimentos',
          group: 'school',
        },
        {
          id: 'billing_benefits',
          label: 'Faturação AGT & Clube',
          description: 'Planos AOA, SAF-T XML e parceiros',
          group: 'school',
        },
        {
          id: 'erp_verifiers',
          label: 'ERPs & Verificadores',
          description: 'Integrações Fase 2 e SheerID/GitHub',
          group: 'school',
          badge: 'Fase 2',
        },
      ];
    }

    if (!hasSchool) {
      return [
        {
          id: 'onboarding',
          label: 'Registar Minha Escola',
          description: 'Configuração inicial e site institucional',
          group: 'school',
        },
      ];
    }

    const secretaryItems: NavItem[] = [
      {
        id: 'overview',
        label: 'Visão Geral',
        description: 'Resumo e progresso da ativação escolar',
        group: 'school',
      },
      {
        id: 'directory',
        label: 'Alunos & Docentes',
        description: 'Importação CSV e gestão de matrículas',
        group: 'school',
      },
      {
        id: 'provisioning',
        label: 'Contas Google & MS',
        description: 'E-mails institucionais e licenças cloud',
        group: 'school',
      },
      {
        id: 'domains',
        label: 'Site & Domínio .edu.ao',
        description: 'Estado do domínio e registos DNS',
        group: 'school',
      },
      {
        id: 'compliance',
        label: 'Proteção de Dados (APD)',
        description: 'Consentimentos parentais e dossiê legal',
        group: 'school',
      },
      {
        id: 'billing_benefits',
        label: 'Planos & Faturas AGT',
        description: 'Subscrição em Kwanzas e comprovativos',
        group: 'school',
      },
    ];

    if (erpFeatureEnabled) {
      secretaryItems.push({
        id: 'erp_verifiers',
        label: 'ERPs & Verificadores',
        description: 'Sincronização ERP e SheerID/GitHub',
        group: 'school',
      });
    }

    return secretaryItems;
  }, [isPlatformAdmin, hasSchool, erpFeatureEnabled]);

  // Se uma feature flag ocultar o separador atual, redireciona com segurança para a Visão Geral
  useEffect(() => {
    if (!authReady || !authUser) return;
    if (!navItems.some((item) => item.id === activeSection) && navItems.length > 0) {
      setActiveSection(navItems[0].id);
    }
  }, [authReady, authUser, navItems, activeSection]);

  if (!authReady) {
    return (
      <div className="py-16 text-center text-sm text-stone-500">
        A verificar sessão autenticada...
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="py-8 max-w-md mx-auto">
        <AuthCard mode="secretary" onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  if (authUser.role !== 'PLATFORM_ADMIN' && authUser.role !== 'SCHOOL_SECRETARY') {
    return (
      <div className="max-w-lg mx-auto bg-white border border-stone-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
        <h1 className="text-lg font-bold text-stone-900">Acesso Restrito à Secretaria</h1>
        <p className="text-sm text-stone-600">
          A sua conta (<span className="font-mono">{authUser.email}</span>) tem o perfil <strong>{authUser.role}</strong>. Utilize o Portal do Aluno/Docente para aceder ao Passaporte Digital.
        </p>
        <div className="flex justify-center gap-3">
          <a href="/portal" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800">
            Ir para Portal PWA
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Terminar Sessão
          </button>
        </div>
      </div>
    );
  }

  const effectiveHost = resolveEffectiveHost(activeSchool);
  const isDemoMode = Boolean(activeSchool && !activeSchool.domain);
  const currentNavMeta = navItems.find((i) => i.id === activeSection) || navItems[0];
  const opsItems = navItems.filter((i) => i.group === 'ops');
  const schoolItems = navItems.filter((i) => i.group === 'school');

  const renderSidebarLinks = () => (
    <div className="space-y-5">
      {opsItems.length > 0 && (
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-800">
            Backoffice EduLink
          </p>
          {opsItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => navigateTo(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-between gap-2 ${
                  active
                    ? 'bg-amber-100/80 text-amber-950 font-bold border border-amber-300/70'
                    : 'text-stone-700 hover:bg-stone-100 font-medium border border-transparent'
                }`}
              >
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {schoolItems.length > 0 && (
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-500">
            {isPlatformAdmin ? 'Gestão da Escola' : 'Painel da Instituição'}
          </p>
          {schoolItems.map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => navigateTo(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-between gap-2 ${
                  active
                    ? 'bg-teal-50 text-teal-900 font-bold border border-teal-200'
                    : 'text-stone-700 hover:bg-stone-100 font-medium border border-transparent'
                }`}
              >
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="shrink-0 rounded-full bg-stone-200/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-stone-600">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Rodapé da Sidebar: Conta Autenticada */}
      <div className="pt-4 border-t border-stone-200 space-y-2.5 px-1">
        <div className="px-2">
          <span
            className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mb-1 ${
              isPlatformAdmin ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-800'
            }`}
          >
            {isPlatformAdmin ? 'Operador EduLink' : 'Secretaria Escolar'}
          </span>
          <p className="text-xs font-bold text-stone-900 truncate">{authUser.full_name}</p>
          <p className="text-[11px] font-mono text-stone-500 truncate">{authUser.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
        >
          Terminar Sessão
        </button>
      </div>
    </div>
  );

  // Fluxo focado sem sidebar para secretarias que ainda vão registar a 1.ª escola
  if (!isPlatformAdmin && !hasSchool) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 mb-1.5">
              Primeiro Acesso · Secretaria Escolar
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900">
              Configure a sua instituição na EduLink
            </h1>
            <p className="text-xs sm:text-sm text-stone-600">
              Em poucos minutos gera o site institucional, prepara o pedido .edu.ao e desbloqueia Google Workspace, Microsoft 365 e Canva Educação.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Sair ({authUser.email})
          </button>
        </div>

        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`p-4 rounded-xl border text-sm ${
              feedback.type === 'success'
                ? 'bg-teal-50 border-teal-200 text-teal-950'
                : 'bg-red-50 border-red-200 text-red-950'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="font-semibold">{feedback.message}</p>
              <button type="button" onClick={() => setFeedback(null)} className="text-xs font-semibold underline">
                Fechar
              </button>
            </div>
          </div>
        )}

        <OnboardingTab
          onSchoolCreated={async (id) => {
            await syncSession();
            await loadSchools(id);
            navigateTo('overview');
          }}
          onFeedback={setFeedback}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
      {/* Barra Mobile para abrir menu */}
      <div className="lg:hidden flex items-center justify-between gap-3 bg-white border border-stone-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
            {isPlatformAdmin ? 'Backoffice EduLink' : activeSchool?.name || 'Secretaria'}
          </p>
          <p className="text-sm font-bold text-stone-900 truncate">{currentNavMeta?.label}</p>
        </div>
        <button
          type="button"
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-admin-nav"
          onClick={() => setMobileNavOpen((prev) => !prev)}
          className="shrink-0 rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-800"
        >
          {mobileNavOpen ? 'Fechar Menu' : 'Menu'}
        </button>
      </div>

      {mobileNavOpen && (
        <aside id="mobile-admin-nav" className="lg:hidden bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          {renderSidebarLinks()}
        </aside>
      )}

      {/* Sidebar Desktop Fixa */}
      <aside
        aria-label="Navegação do painel administrativo"
        className="hidden lg:block sticky top-20 bg-white border border-stone-200 rounded-2xl p-4 shadow-sm"
      >
        {activeSchool && !isPlatformAdmin && (
          <div className="mb-4 pb-4 border-b border-stone-100 flex items-center gap-2.5 px-1">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: activeSchool.primary_color || '#0D9488' }}
            >
              {activeSchool.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-900 truncate">{activeSchool.name}</p>
              <p className="text-[11px] font-mono text-stone-500 truncate">{effectiveHost}</p>
            </div>
          </div>
        )}
        {renderSidebarLinks()}
      </aside>

      {/* Área Principal de Conteúdo */}
      <div className="min-w-0 space-y-5">
        {/* Contexto da Escola / Seletor Multi-Tenant */}
        {isPlatformAdmin && (
          <SchoolSelectorBar
            schools={schools}
            selectedSchoolId={selectedSchoolId}
            onSelectSchool={(id) => {
              setSelectedSchoolId(id);
              setFeedback(null);
            }}
            onRefreshSchools={() => loadSchools(selectedSchoolId)}
          />
        )}

        {/* Cabeçalho Contextual da Secção Atual */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
                {currentNavMeta?.label}
              </h1>
              {activeSchool && activeSection !== 'platform_ops' && activeSection !== 'onboarding' && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isDemoMode
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {isDemoMode ? 'Modo Demonstração' : 'Domínio Oficial'}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">{currentNavMeta?.description}</p>
          </div>

          {activeSchool && effectiveHost && activeSection !== 'platform_ops' && activeSection !== 'onboarding' && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <a
                href={`https://${effectiveHost}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-stone-800 hover:bg-stone-100 transition"
              >
                {effectiveHost} ↗
              </a>
            </div>
          )}
        </div>

        {/* Alerta Global de Feedback */}
        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`p-4 rounded-xl border text-sm ${
              feedback.type === 'success'
                ? 'bg-teal-50 border-teal-200 text-teal-950'
                : 'bg-red-50 border-red-200 text-red-950'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <p className="font-semibold">{feedback.message}</p>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-xs font-semibold underline opacity-80 hover:opacity-100 shrink-0"
              >
                Fechar
              </button>
            </div>
            {feedback.details && (
              <div className="mt-2 text-xs font-mono bg-white/80 p-3 rounded-lg border border-teal-200 space-y-1">
                {feedback.details.effective_site_host && (
                  <p>
                    <strong>Site:</strong> https://{feedback.details.effective_site_host}
                  </p>
                )}
                {feedback.details.domain && (
                  <p>
                    <strong>Domínio Oficial:</strong> {feedback.details.domain}
                  </p>
                )}
                {Array.isArray(feedback.details.next_steps) && (
                  <ul className="list-disc list-inside pt-1 font-sans">
                    {feedback.details.next_steps.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* VISÃO GERAL DA ESCOLA (NOVO PAINEL RESUMO MVP) */}
        {activeSection === 'overview' && (
          <div className="space-y-5">
            {!activeSchool ? (
              <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-stone-800">Nenhuma instituição selecionada.</p>
                <p className="text-xs text-stone-500">
                  Selecione uma escola na barra superior ou crie uma nova instituição no Wizard de Onboarding.
                </p>
                {isPlatformAdmin && (
                  <button
                    type="button"
                    onClick={() => navigateTo('onboarding')}
                    className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    Registar Nova Escola
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Cartões de Métricas Chave */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
                    <span className="text-[11px] font-semibold uppercase text-stone-500">Estudantes Ativos</span>
                    <p className="text-2xl font-extrabold text-stone-900 mt-1">
                      {activeSchool.total_students ?? 0}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTo('directory')}
                      className="mt-2 text-xs font-semibold text-teal-700 hover:underline"
                    >
                      Gerir ou importar CSV →
                    </button>
                  </div>

                  <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
                    <span className="text-[11px] font-semibold uppercase text-stone-500">Docentes</span>
                    <p className="text-2xl font-extrabold text-stone-900 mt-1">
                      {activeSchool.total_teachers ?? 0}
                    </p>
                    <span className="mt-2 block text-[11px] text-stone-500">
                      {activeSchool.institution_type === 'MESCTI_HIGHER_ED'
                        ? 'Ensino Superior (MESCTI)'
                        : 'Ensino Geral / Técnico (MED)'}
                    </span>
                  </div>

                  <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
                    <span className="text-[11px] font-semibold uppercase text-stone-500">Dossiê Documental</span>
                    <p className="text-2xl font-extrabold text-stone-900 mt-1">
                      {activeSchool.documents_uploaded_count ?? 0} / 4
                    </p>
                    <span className="mt-2 block text-[11px] text-stone-500">
                      NIF {activeSchool.nif} · {activeSchool.alvara_med_mescti}
                    </span>
                  </div>

                  <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
                    <span className="text-[11px] font-semibold uppercase text-stone-500">Conformidade APD</span>
                    <p className="text-lg font-extrabold mt-1">
                      <span className={activeSchool.apd_notified ? 'text-emerald-700' : 'text-amber-700'}>
                        {activeSchool.apd_notified ? 'Notificado' : 'Pendente'}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTo('compliance')}
                      className="mt-2 text-xs font-semibold text-teal-700 hover:underline"
                    >
                      {activeSchool.apd_dossier_number
                        ? `Dossiê ${activeSchool.apd_dossier_number}`
                        : 'Gerar dossiê Lei n.º 22/11 →'}
                    </button>
                  </div>
                </div>

                {/* Pipeline Chave-na-Mão de Ativação */}
                <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-stone-900">
                        Pipeline de Ativação Digital Chave-na-Mão
                      </h2>
                      <p className="text-xs text-stone-500">
                        Acompanhamento das acreditações oficiais geridas em nome de {activeSchool.name}.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {[
                      {
                        title: '1. Domínio .edu.ao & DNS',
                        stage: (activeSchool.dns_status || (activeSchool.domain ? 'SUBMITTED' : 'PENDING_DOCS')) as SetupStage,
                        actionLabel: 'Configurar DNS',
                        target: 'domains' as SectionKey,
                      },
                      {
                        title: '2. Google Workspace',
                        stage: (activeSchool.google_status || 'NOT_STARTED') as SetupStage,
                        actionLabel: 'Provisionar Contas',
                        target: 'provisioning' as SectionKey,
                      },
                      {
                        title: '3. Microsoft 365 (A1)',
                        stage: (activeSchool.microsoft_status || 'NOT_STARTED') as SetupStage,
                        actionLabel: 'Gerir Integração',
                        target: 'provisioning' as SectionKey,
                      },
                      {
                        title: '4. Canva Educação',
                        stage: (activeSchool.canva_status ||
                          (activeSchool.institution_type === 'MESCTI_HIGHER_ED'
                            ? 'NOT_ELIGIBLE'
                            : 'NOT_STARTED')) as SetupStage,
                        actionLabel: 'Ver Acessos SSO',
                        target: 'provisioning' as SectionKey,
                      },
                    ].map((card) => {
                      const meta = STAGE_STYLE[card.stage] || STAGE_STYLE.NOT_STARTED;
                      return (
                        <div key={card.title} className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 flex flex-col justify-between gap-3">
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-stone-900">{card.title}</p>
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.cls}`}>
                              {meta.label}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigateTo(card.target)}
                            className="text-left text-xs font-semibold text-teal-800 hover:underline"
                          >
                            {card.actionLabel} →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}
          </div>
        )}

        {/* MÓDULOS CARREGADOS APENAS QUANDO ATIVOS (ELIMINA PEDIDOS API DESNECESSÁRIOS) */}
        {activeSection === 'platform_ops' && isPlatformAdmin && (
          <PlatformOpsTab
            schools={schools}
            selectedSchoolId={selectedSchoolId}
            onSelectSchool={(id) => {
              setSelectedSchoolId(id);
              setFeedback(null);
            }}
            onOperateSchool={() => navigateTo('overview')}
            onSchoolsUpdated={() => loadSchools(selectedSchoolId)}
            onFeedback={setFeedback}
          />
        )}

        {activeSection === 'onboarding' && isPlatformAdmin && (
          <OnboardingTab
            onSchoolCreated={async (id) => {
              await loadSchools(id);
              navigateTo('overview');
            }}
            onFeedback={setFeedback}
          />
        )}

        {activeSection === 'directory' && (
          <DirectoryTab
            schoolId={selectedSchoolId}
            onFeedback={setFeedback}
            onDirectoryUpdated={() => loadSchools(selectedSchoolId)}
          />
        )}

        {activeSection === 'provisioning' && (
          <ProvisioningTab schoolId={selectedSchoolId} onFeedback={setFeedback} />
        )}

        {activeSection === 'domains' && (
          <DomainsDNSTab schoolId={selectedSchoolId} onFeedback={setFeedback} />
        )}

        {activeSection === 'compliance' && (
          <ComplianceAPDTab
            schoolId={selectedSchoolId}
            onFeedback={setFeedback}
            onSchoolUpdated={() => loadSchools(selectedSchoolId)}
          />
        )}

        {activeSection === 'erp_verifiers' && erpFeatureEnabled && (
          <ERPAndVerifiersTab
            schoolId={selectedSchoolId}
            onFeedback={setFeedback}
            onDirectoryUpdated={() => loadSchools(selectedSchoolId)}
          />
        )}

        {activeSection === 'billing_benefits' && (
          <BillingAndBenefitsTab
            schoolId={selectedSchoolId}
            userRole={authUser.role}
            onFeedback={setFeedback}
            enableBenefitsClub={benefitsFeatureEnabled}
          />
        )}
      </div>
    </div>
  );
}