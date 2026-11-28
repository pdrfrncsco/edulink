'use client';

import React, { useEffect, useState } from 'react';
import { StatusBadge, TabPanel, Tabs } from '@/components/ui';
import type { AuthUser } from '@/lib/auth';
import AGTInvoicesPanel from './billing/AGTInvoicesPanel';
import BenefitsCatalogPanel from './billing/BenefitsCatalogPanel';
import SubscriptionsPanel from './billing/SubscriptionsPanel';
import type {
  ExtendedPayment,
  ExtendedPlan,
  ExtendedSubscription,
  SubTab,
} from './billing/types';
import {
  apiJson,
  type AGTInvoice,
  type BenefitOffer,
  type BenefitPartner,
  type FeedbackState,
} from './types';

interface BillingAndBenefitsTabProps {
  schoolId: string;
  userRole: AuthUser['role'];
  onFeedback: (fb: FeedbackState | null) => void;
  enableBenefitsClub?: boolean;
}

/** Commercial subscriptions, electronic AGT invoicing, and Benefits Club orchestrator. */
export default function BillingAndBenefitsTab({
  schoolId,
  userRole,
  onFeedback,
  enableBenefitsClub = true,
}: BillingAndBenefitsTabProps) {
  const isPlatformAdmin = userRole === 'PLATFORM_ADMIN';
  const showBenefitsSection = isPlatformAdmin || enableBenefitsClub;

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('billing');
  const [plans, setPlans] = useState<ExtendedPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<ExtendedSubscription[]>([]);
  const [payments, setPayments] = useState<ExtendedPayment[]>([]);
  const [invoices, setInvoices] = useState<AGTInvoice[]>([]);
  const [partners, setPartners] = useState<BenefitPartner[]>([]);
  const [offers, setOffers] = useState<BenefitOffer[]>([]);
  const [busy, setBusy] = useState(false);
  const [fetchingCatalogs, setFetchingCatalogs] = useState(true);
  const [fetchingBilling, setFetchingBilling] = useState(true);

  const loadGlobalCatalogs = async () => {
    setFetchingCatalogs(true);
    try {
      const [planRes, partRes, offerRes] = await Promise.all([
        apiJson<ExtendedPlan[]>('/billing/plans/'),
        apiJson<{ results?: BenefitPartner[] } | BenefitPartner[]>('/benefits/partners/'),
        apiJson<{ results?: BenefitOffer[] } | BenefitOffer[]>('/benefits/offers/'),
      ]);
      setPlans(Array.isArray(planRes) ? planRes : []);
      setPartners(Array.isArray(partRes) ? partRes : partRes.results || []);
      setOffers(Array.isArray(offerRes) ? offerRes : offerRes.results || []);
    } catch (err: any) {
      onFeedback({
        type: 'error',
        message: err.message || 'Erro ao carregar planos e benefícios.',
      });
    } finally {
      setFetchingCatalogs(false);
    }
  };

  const loadSchoolBilling = async () => {
    setFetchingBilling(true);
    try {
      const qs = schoolId ? `?school=${encodeURIComponent(schoolId)}` : '';
      const [subRes, payRes, invRes] = await Promise.all([
        apiJson<{ results?: ExtendedSubscription[] } | ExtendedSubscription[]>(
          `/billing/subscriptions/${qs}`
        ),
        apiJson<{ results?: ExtendedPayment[] } | ExtendedPayment[]>(
          `/billing/payments/${qs}`
        ),
        apiJson<{ results?: AGTInvoice[] } | AGTInvoice[]>(`/billing/invoices/${qs}`),
      ]);

      setSubscriptions(Array.isArray(subRes) ? subRes : subRes.results || []);
      setPayments(Array.isArray(payRes) ? payRes : payRes.results || []);
      setInvoices(Array.isArray(invRes) ? invRes : invRes.results || []);
    } catch (err: any) {
      onFeedback({
        type: 'error',
        message: err.message || 'Erro ao carregar faturação da escola.',
      });
    } finally {
      setFetchingBilling(false);
    }
  };

  useEffect(() => {
    loadGlobalCatalogs();
  }, []);

  useEffect(() => {
    loadSchoolBilling();
  }, [schoolId]);

  useEffect(() => {
    if (!showBenefitsSection && activeSubTab === 'benefits') {
      setActiveSubTab('billing');
    }
  }, [showBenefitsSection, activeSubTab]);

  const tabItems: { id: SubTab; label: string; badge: number }[] = [
    { id: 'billing', label: 'Planos & Pagamentos', badge: subscriptions.length },
    { id: 'invoices', label: 'Faturas AGT', badge: invoices.length },
    ...(showBenefitsSection
      ? [{ id: 'benefits' as SubTab, label: 'Clube de Benefícios', badge: partners.length }]
      : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          idPrefix="billing-subtab"
          ariaLabel="Secções financeiras e benefícios"
          variant="pills"
          items={tabItems}
          value={activeSubTab}
          onChange={setActiveSubTab}
        />

        {isPlatformAdmin && !schoolId && activeSubTab !== 'benefits' && (
          <StatusBadge tone="warning" className="whitespace-normal">
            A exibir todas as escolas — selecione uma na barra superior para filtrar ou contratar
            plano
          </StatusBadge>
        )}
      </div>

      <TabPanel idPrefix="billing-subtab" tabId="billing" active={activeSubTab === 'billing'}>
        <SubscriptionsPanel
          schoolId={schoolId}
          isPlatformAdmin={isPlatformAdmin}
          plans={plans}
          subscriptions={subscriptions}
          payments={payments}
          busy={busy}
          fetching={fetchingBilling}
          onSetBusy={setBusy}
          onReload={loadSchoolBilling}
          onFeedback={onFeedback}
        />
      </TabPanel>

      <TabPanel idPrefix="billing-subtab" tabId="invoices" active={activeSubTab === 'invoices'}>
        <AGTInvoicesPanel
          invoices={invoices}
          isPlatformAdmin={isPlatformAdmin}
          busy={busy}
          fetching={fetchingBilling}
          onSetBusy={setBusy}
          onFeedback={onFeedback}
        />
      </TabPanel>

      {showBenefitsSection && (
        <TabPanel idPrefix="billing-subtab" tabId="benefits" active={activeSubTab === 'benefits'}>
          <BenefitsCatalogPanel
            isPlatformAdmin={isPlatformAdmin}
            partners={partners}
            offers={offers}
            busy={busy}
            fetching={fetchingCatalogs}
            onSetBusy={setBusy}
            onReload={loadGlobalCatalogs}
            onFeedback={onFeedback}
          />
        </TabPanel>
      )}
    </div>
  );
}
