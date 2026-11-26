'use client';

import React, { useEffect, useRef, useState } from 'react';
import BillingAndBenefitsTab from '@/components/admin/BillingAndBenefitsTab';
import ComplianceAPDTab from '@/components/admin/ComplianceAPDTab';
import DirectoryTab from '@/components/admin/DirectoryTab';
import DomainsDNSTab from '@/components/admin/DomainsDNSTab';
import ERPAndVerifiersTab from '@/components/admin/ERPAndVerifiersTab';
import OnboardingTab from '@/components/admin/OnboardingTab';
import ProvisioningTab from '@/components/admin/ProvisioningTab';
import SchoolSelectorBar from '@/components/admin/SchoolSelectorBar';
import { apiJson, FeedbackState, School } from '@/components/admin/types';
import AuthCard from '@/components/auth/AuthCard';
import { AuthUser, clearAuthSession, getAccessToken, getStoredUser, updateStoredUser } from '@/lib/auth';

type TabKey =
  | 'onboarding'
  | 'directory'
  | 'provisioning'
  | 'domains'
  | 'compliance'
  | 'erp_verifiers'
  | 'billing_benefits';

const TABS: { id: TabKey; label: string }[] = [
  { id: 'onboarding', label: '1. Onboarding & Escola' },
  { id: 'directory', label: '2. Directório & CSV' },
  { id: 'provisioning', label: '3. Provisionamento Cloud' },
  { id: 'domains', label: '4. Domínios .edu.ao & DNS' },
  { id: 'compliance', label: '5. Dossiê APD & Termos' },
  { id: 'erp_verifiers', label: '6. ERPs & Verificadores' },
  { id: 'billing_benefits', label: '7. Planos, Kwanzas & AGT' },
];

export default function AdminPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('onboarding');
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    onboarding: null,
    directory: null,
    provisioning: null,
    domains: null,
    compliance: null,
    erp_verifiers: null,
    billing_benefits: null,
  });

  const loadSchools = async (preferSchoolId?: string) => {
    try {
      const data = await apiJson<{ results: School[] }>('/tenants/schools/');
      const list = data.results || [];
      setSchools(list);
      if (preferSchoolId) {
        setSelectedSchoolId(preferSchoolId);
      } else if (list.length > 0) {
        setSelectedSchoolId((prev) => prev || list[0].id);
      }
    } catch (err: any) {
      if (String(err.message).includes('401')) {
        clearAuthSession();
        setAuthUser(null);
      }
    }
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
    if (user.school_id) {
      setActiveTab('directory');
    } else {
      setActiveTab('onboarding');
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setAuthUser(null);
    setSchools([]);
    setSelectedSchoolId('');
    setFeedback(null);
  };

  const selectTab = (nextTab: TabKey, focusTab = false) => {
    setActiveTab(nextTab);
    if (focusTab) {
      const el = tabRefs.current[nextTab];
      el?.focus();
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = TABS.length - 1;

    if (nextIdx !== null) {
      e.preventDefault();
      selectTab(TABS[nextIdx].id, true);
    }
  };

  if (!authReady) {
    return (
      <div className="py-16 text-center text-sm text-stone-500">
        A verificar sessão autenticada...
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="py-6">
        <AuthCard mode="secretary" onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  if (authUser.role !== 'PLATFORM_ADMIN' && authUser.role !== 'SCHOOL_SECRETARY') {
    return (
      <div className="max-w-lg mx-auto bg-white border border-stone-200 rounded-2xl p-6 text-center space-y-4">
        <h1 className="text-lg font-bold text-stone-900">Acesso Restrito à Secretaria</h1>
        <p className="text-sm text-stone-600">
          A sua conta ({authUser.email}) tem o papel <strong>{authUser.role}</strong>. Utilize o Portal do Aluno para aceder ao seu Cartão Digital.
        </p>
        <div className="flex justify-center gap-3">
          <a href="/portal" className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold">
            Ir para Portal do Aluno
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700"
          >
            Terminar Sessão
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
              Portal Operacional da Secretaria
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Gestão Multi-Tenant, Provisionamento & Conformidade
            </h1>
            <p className="text-sm text-stone-600 max-w-2xl">
              Controle completo do ciclo escolar: registo <code>.edu.ao</code>, importação CSV, sincronização Google/Microsoft, zona DNS Cloudflare e dossiê da APD (Lei n.º 22/11).
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs">
            <div>
              <span className="font-bold text-stone-900 block">{authUser.full_name}</span>
              <span className="text-stone-500 font-mono">{authUser.email}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-semibold text-stone-700 hover:bg-stone-100"
            >
              Sair
            </button>
          </div>
        </div>

        <SchoolSelectorBar
          schools={schools}
          selectedSchoolId={selectedSchoolId}
          onSelectSchool={setSelectedSchoolId}
          onRefreshSchools={() => loadSchools()}
        />

        <div
          role="tablist"
          aria-label="Módulos do Portal da Secretaria"
          className="edulink-tablist border-b border-stone-200 gap-2 sm:gap-6 text-sm"
        >
          {TABS.map((tab, idx) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className="edulink-tab px-2 pb-3.5 pt-1 text-stone-600 hover:text-stone-900 whitespace-nowrap font-medium"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
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
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-xs font-semibold underline opacity-80 hover:opacity-100"
            >
              Fechar
            </button>
          </div>
          {feedback.details && (
            <div className="mt-2 text-xs font-mono bg-white/80 p-3 rounded border border-teal-200 space-y-1">
              {feedback.details.school_id && (
                <p>
                  <strong>ID:</strong> {feedback.details.school_id}
                </p>
              )}
              {feedback.details.domain && (
                <p>
                  <strong>Domínio:</strong> {feedback.details.domain}
                </p>
              )}
              {feedback.details.next_steps && (
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

      <div role="tabpanel" aria-labelledby="tab-onboarding" hidden={activeTab !== 'onboarding'}>
        <OnboardingTab
          onSchoolCreated={(id) => {
            loadSchools(id);
            setActiveTab('directory');
          }}
          onFeedback={setFeedback}
        />
      </div>

      <div role="tabpanel" aria-labelledby="tab-directory" hidden={activeTab !== 'directory'}>
        <DirectoryTab
          schoolId={selectedSchoolId}
          onFeedback={setFeedback}
          onDirectoryUpdated={() => loadSchools(selectedSchoolId)}
        />
      </div>

      <div role="tabpanel" aria-labelledby="tab-provisioning" hidden={activeTab !== 'provisioning'}>
        <ProvisioningTab schoolId={selectedSchoolId} onFeedback={setFeedback} />
      </div>

      <div role="tabpanel" aria-labelledby="tab-domains" hidden={activeTab !== 'domains'}>
        <DomainsDNSTab schoolId={selectedSchoolId} onFeedback={setFeedback} />
      </div>

      <div role="tabpanel" aria-labelledby="tab-compliance" hidden={activeTab !== 'compliance'}>
        <ComplianceAPDTab
          schoolId={selectedSchoolId}
          onFeedback={setFeedback}
          onSchoolUpdated={() => loadSchools(selectedSchoolId)}
        />
      </div>

      <div role="tabpanel" aria-labelledby="tab-erp_verifiers" hidden={activeTab !== 'erp_verifiers'}>
        <ERPAndVerifiersTab
          schoolId={selectedSchoolId}
          onFeedback={setFeedback}
          onDirectoryUpdated={() => loadSchools(selectedSchoolId)}
        />
      </div>

      <div role="tabpanel" aria-labelledby="tab-billing_benefits" hidden={activeTab !== 'billing_benefits'}>
        <BillingAndBenefitsTab schoolId={selectedSchoolId} onFeedback={setFeedback} />
      </div>
    </div>
  );
}
