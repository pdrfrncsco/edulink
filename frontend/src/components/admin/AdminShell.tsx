'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { AlertBanner, Card, StatusBadge } from '@/components/ui';
import AuthCard from '@/components/auth/AuthCard';
import {
  AuthUser,
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  updateStoredUser,
} from '@/lib/auth';
import { buildSchoolSiteHref } from '@/lib/siteUrls';
import { useIsLocalHost } from '@/lib/useIsLocalHost';
import {
  AdminAccessGate,
  AdminFeedbackBanner,
  AdminFirstRunOnboarding,
} from './AdminAccessGate';
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
import {
  buildAdminNavItems,
  getSectionFromUrl,
  resolveEffectiveHost,
  syncSectionToUrl,
  type SectionKey,
} from './navigation';
import { apiJson, FeedbackState, School } from './types';

interface AdminShellProps {
  surfaceMode?: 'admin' | 'ops';
}

/**
 * Shared authenticated workspace shell separating `/admin` (School Secretariat)
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
        setSelectedSchoolId((prev) =>
          prev && list.some((s) => s.id === prev) ? prev : list[0].id
        );
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
      if (surfaceMode === 'ops') {
        return requested || 'platform_ops';
      }
      if (requested && requested !== 'platform_ops' && requested !== 'onboarding') {
        return requested;
      }
      return 'overview';
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
  const erpFeatureEnabled =
    isPlatformAdmin || Boolean(activeSchool?.enable_erp_sync || authUser?.enable_erp_sync);
  const benefitsFeatureEnabled =
    isPlatformAdmin ||
    Boolean(activeSchool?.enable_benefits_club || authUser?.enable_benefits_club);

  const navItems = useMemo(
    () =>
      buildAdminNavItems({
        isPlatformAdmin,
        surfaceMode,
        hasSchool,
        erpFeatureEnabled,
      }),
    [isPlatformAdmin, surfaceMode, hasSchool, erpFeatureEnabled]
  );

  useEffect(() => {
    if (!authReady || !authUser) return;
    if (!navItems.some((item) => item.id === activeSection) && navItems.length > 0) {
      setActiveSection(navItems[0].id);
    }
  }, [authReady, authUser, navItems, activeSection]);

  if (!authReady) {
    return (
      <div className="py-16 text-center text-sm text-stone-500" role="status">
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

  if (
    (surfaceMode === 'ops' && !isPlatformAdmin) ||
    (authUser.role !== 'PLATFORM_ADMIN' && authUser.role !== 'SCHOOL_SECRETARY')
  ) {
    return (
      <AdminAccessGate
        authUser={authUser}
        surfaceMode={surfaceMode}
        onLogout={handleLogout}
      />
    );
  }

  const effectiveHost = resolveEffectiveHost(activeSchool);
  const isDemoMode = Boolean(activeSchool && !activeSchool.domain);
  const currentNavMeta = navItems.find((i) => i.id === activeSection) || navItems[0];

  if (!isPlatformAdmin && !hasSchool) {
    return (
      <AdminFirstRunOnboarding
        authUser={authUser}
        feedback={feedback}
        isLocalHostBrowser={isLocalHostBrowser}
        onLogout={handleLogout}
        onDismissFeedback={() => setFeedback(null)}
        onSchoolCreated={async (id) => {
          await syncSession();
          await loadSchools(id);
          navigateTo('overview');
        }}
        onFeedback={setFeedback}
      />
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
        isPlatformAdmin={isPlatformAdmin && surfaceMode === 'ops'}
        mobileNavOpen={mobileNavOpen}
        onToggleMobileNav={() => setMobileNavOpen((prev) => !prev)}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />

      <div className="min-w-0 space-y-5">
        {isPlatformAdmin && surfaceMode === 'admin' && (
          <AlertBanner
            tone="warning"
            action={
              <a
                href="/ops"
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-950"
              >
                Abrir Backoffice Multi-Tenant (/ops)
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            }
          >
            Está a visualizar o <strong>Painel da Secretaria (/admin)</strong>. Para revisão
            documental, RBAC global, feature flags e exportação SAF-T XML utilize a consola
            dedicada <code>/ops</code>.
          </AlertBanner>
        )}

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
            {activeSchool &&
              effectiveHost &&
              activeSection !== 'platform_ops' &&
              activeSection !== 'onboarding' && (
                <a
                  href={buildSchoolSiteHref(effectiveHost, isLocalHostBrowser)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 font-mono text-stone-800 hover:bg-stone-100 transition"
                >
                  {isLocalHostBrowser ? `Pré-visualizar Site (${effectiveHost})` : effectiveHost}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
          </div>
        </Card>

        <AdminFeedbackBanner
          feedback={feedback}
          isLocalHostBrowser={isLocalHostBrowser}
          onDismiss={() => setFeedback(null)}
        />

        {activeSection === 'overview' && (
          <SchoolOverviewPanel
            activeSchool={activeSchool}
            isPlatformAdmin={isPlatformAdmin && surfaceMode === 'ops'}
            onNavigate={navigateTo}
          />
        )}

        {activeSection === 'platform_ops' && isPlatformAdmin && surfaceMode === 'ops' && (
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

        {activeSection === 'onboarding' && isPlatformAdmin && surfaceMode === 'ops' && (
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
            userRole={surfaceMode === 'ops' ? authUser.role : 'SCHOOL_SECRETARY'}
            onFeedback={setFeedback}
            enableBenefitsClub={benefitsFeatureEnabled}
          />
        )}
      </div>
    </div>
  );
}
