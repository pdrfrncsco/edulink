'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import { AlertBanner, Button, Card, StatusBadge } from '@/components/ui';
import AuthCard from '@/components/auth/AuthCard';
import {
  AuthUser,
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  updateStoredUser,
} from '@/lib/auth';
import { buildSchoolSiteHref, getDisplayRootDomain } from '@/lib/siteUrls';
import { useIsLocalHost } from '@/lib/useIsLocalHost';
import AdminSidebar from './AdminSidebar';
import BillingAndBenefitsTab from './BillingAndBenefitsTab';
import ComplianceAPDTab from './ComplianceAPDTab';
import DirectoryTab from './DirectoryTab';
import DomainsDNSTab from './DomainsDNSTab';
import ERPAndVerifiersTab from './ERPAndVerifiersTab';
import OnboardingTab from './OnboardingTab';
import PlatformOpsTab from './PlatformOpsTab';
import ProvisioningTab from './ProvisioningTab';
import SchoolOverviewPanel from './SchoolOverviewPanel';
import SchoolSelectorBar from './SchoolSelectorBar';
import type { NavItem, SectionKey } from './navigation';
import { apiJson, FeedbackState, School } from './types';

const ROOT_DOMAIN = getDisplayRootDomain();

const VALID_SECTIONS: SectionKey[] = [
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

function resolveEffectiveHost(school: School | null): string {
  if (!school) return '';
  if (school.effective_site_host) return school.effective_site_host;
  if (school.domain) return school.domain;
  if (school.preview_slug) return `${school.preview_slug}.${ROOT_DOMAIN}`;
  return '';
}

function getSectionFromUrl(): SectionKey | null {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('section');
  return param && VALID_SECTIONS.includes(param as SectionKey) ? (param as SectionKey) : null;
}

function syncSectionToUrl(section: SectionKey) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('section', section);
  window.history.replaceState({}, '', url.toString());
}

interface AdminShellProps {
  surfaceMode?: 'admin' | 'ops';
}

/**
 * Shared authenticated workspace shell for `/admin` (School Secretariat)
 * and `/ops` (EduLink multi-tenant Backoffice).
 */
export default function AdminShell({ surfaceMode = 'admin' }: AdminShellProps) {
  const isLocalHostBrowser = useIsLocalHost();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>(
    surfaceMode === 'ops' ? 'platform_ops' : 'overview'
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const loadSchools = async (preferSchoolId?: string) => {
    try {
      const data = await apiJson<{ results?: School[] } | School[]>('/tenants/schools/');
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

  const pickDefaultSection = (user: AuthUser): SectionKey => {
    const requested = getSectionFromUrl();
    if (user.role === 'PLATFORM_ADMIN') {
      return requested || (surfaceMode === 'ops' ? 'platform_ops' : 'platform_ops');
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
    const cached = getStoredUser();
    if (!token) {
      setAuthReady(true);
      return;
    }
    if (cached) setAuthUser(cached);

    try {
      const me = await apiJson<AuthUser>('/auth/me/');
      setAuthUser(me);
      updateStoredUser(me);
      setActiveSection(pickDefaultSection(me));
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
    setAuthUser(user);
    setFeedback(null);
    await loadSchools(user.school_id || undefined);
    const nextSection = pickDefaultSection(user);
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
          description: 'Escolas, contas, documentos e estado da plataforma',
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

  if (surfaceMode === 'ops' && !isPlatformAdmin) {
    return (
      <Card padding="lg" className="max-w-lg mx-auto text-center space-y-4">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-700">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-stone-900">Área Exclusiva da Operação EduLink (/ops)</h1>
        <p className="text-sm text-stone-600">
          A sua conta (<span className="font-mono">{authUser.email}</span>) pertence ao perfil{' '}
          <strong>{authUser.role}</strong>. Para gerir a sua instituição, utilize o Painel da Secretaria.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <a
            href={authUser.role === 'SCHOOL_SECRETARY' ? '/admin' : '/portal'}
            className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            {authUser.role === 'SCHOOL_SECRETARY' ? 'Ir para Painel da Escola' : 'Ir para Portal PWA'}
          </a>
          <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
            Terminar Sessão
          </Button>
        </div>
      </Card>
    );
  }

  if (authUser.role !== 'PLATFORM_ADMIN' && authUser.role !== 'SCHOOL_SECRETARY') {
    return (
      <Card padding="lg" className="max-w-lg mx-auto text-center space-y-4">
        <h1 className="text-lg font-bold text-stone-900">Acesso Restrito à Secretaria</h1>
        <p className="text-sm text-stone-600">
          A sua conta (<span className="font-mono">{authUser.email}</span>) tem o perfil{' '}
          <strong>{authUser.role}</strong>. Utilize o Portal do Aluno/Docente para aceder ao Passaporte Digital.
        </p>
        <div className="flex justify-center gap-3">
          <a
            href="/portal"
            className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Ir para Portal PWA
          </a>
          <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
            Terminar Sessão
          </Button>
        </div>
      </Card>
    );
  }

  const effectiveHost = resolveEffectiveHost(activeSchool);
  const isDemoMode = Boolean(activeSchool && !activeSchool.domain);
  const currentNavMeta = navItems.find((i) => i.id === activeSection) || navItems[0];

  const renderGlobalFeedback = () =>
    feedback ? (
      <AlertBanner
        tone={feedback.type === 'success' ? 'success' : 'error'}
        onDismiss={() => setFeedback(null)}
        dismissLabel="Fechar aviso"
      >
        <p className="font-semibold">{feedback.message}</p>
        {feedback.details && (
          <div className="mt-2 text-xs font-mono bg-white/80 p-3 rounded-lg border border-stone-200 space-y-1 text-stone-800">
            {feedback.details.effective_site_host && (
              <p>
                <strong>Site:</strong>{' '}
                <a
                  href={buildSchoolSiteHref(feedback.details.effective_site_host, isLocalHostBrowser)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-800 underline"
                >
                  {isLocalHostBrowser
                    ? buildSchoolSiteHref(feedback.details.effective_site_host, isLocalHostBrowser)
                    : `https://${feedback.details.effective_site_host}`}
                </a>
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
      </AlertBanner>
    ) : null;

  // Focused onboarding without sidebar for first-time school secretaries
  if (!isPlatformAdmin && !hasSchool) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card padding="md" className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <StatusBadge tone="brand" className="mb-1.5">
              Primeiro Acesso · Secretaria Escolar
            </StatusBadge>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900">
              Configure a sua instituição na EduLink
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Em poucos minutos gera o site institucional, prepara o pedido .edu.ao e desbloqueia Google Workspace, Microsoft 365 e Canva Educação.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
            Sair ({authUser.email})
          </Button>
        </Card>

        {renderGlobalFeedback()}

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
      <AdminSidebar
        authUser={authUser}
        activeSchool={activeSchool}
        effectiveHost={effectiveHost}
        navItems={navItems}
        activeSection={activeSection}
        isPlatformAdmin={isPlatformAdmin}
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />

      <div className="min-w-0 space-y-5">
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

        {/* Contextual Section Header */}
        <Card padding="md" className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
                {currentNavMeta?.label}
              </h1>
              {activeSchool && activeSection !== 'platform_ops' && activeSection !== 'onboarding' && (
                <StatusBadge tone={isDemoMode ? 'warning' : 'success'}>
                  {isDemoMode ? 'Modo Demonstração' : 'Domínio Oficial'}
                </StatusBadge>
              )}
            </div>
            <p className="text-xs text-stone-500">{currentNavMeta?.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isPlatformAdmin && surfaceMode === 'admin' && (
              <a
                href="/ops"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 font-semibold text-amber-900 hover:bg-amber-100 transition"
              >
                Abrir Backoffice /ops
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            {activeSchool && effectiveHost && activeSection !== 'platform_ops' && activeSection !== 'onboarding' && (
              <a
                href={buildSchoolSiteHref(effectiveHost, isLocalHostBrowser)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-stone-800 hover:bg-stone-100 transition"
              >
                {isLocalHostBrowser ? `Pré-visualizar Site (${effectiveHost})` : effectiveHost}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
          </div>
        </Card>

        {renderGlobalFeedback()}

        {activeSection === 'overview' && (
          <SchoolOverviewPanel
            activeSchool={activeSchool}
            isPlatformAdmin={isPlatformAdmin}
            onNavigate={navigateTo}
          />
        )}

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
          <DomainsDNSTab
            schoolId={selectedSchoolId}
            hasOfficialDomain={Boolean(activeSchool?.domain)}
            onFeedback={setFeedback}
          />
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
