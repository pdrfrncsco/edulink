'use client';

import React, { useEffect, useState } from 'react';
import { AlertBanner, ConfirmModal, CopyButton } from '@/components/ui';
import {
  AGTInvoice,
  apiJson,
  BenefitOffer,
  BenefitPartner,
  CommercialPlan,
  FeedbackState,
  KwanzaPayment,
  SchoolSubscription,
} from './types';
import { authFetch, AuthUser, openProtectedHtml } from '@/lib/auth';

interface BillingAndBenefitsTabProps {
  schoolId: string;
  userRole: AuthUser['role'];
  onFeedback: (fb: FeedbackState | null) => void;
  enableBenefitsClub?: boolean;
}

type ExtendedPlan = CommercialPlan & {
  billing_type?: 'ONE_TIME' | 'ANNUAL';
};

type ExtendedSubscription = SchoolSubscription & {
  billing_type?: 'ONE_TIME' | 'ANNUAL';
  status_label?: string;
};

type ExtendedPayment = KwanzaPayment & {
  status_label?: string;
  sandbox_confirm_allowed?: boolean;
};

type SubTab = 'billing' | 'invoices' | 'benefits';
type PayMethod = 'MULTICAIXA_EXPRESS' | 'KWIK' | 'BANK_TRANSFER';

const PAY_METHOD_SHORT: Record<PayMethod, string> = {
  MULTICAIXA_EXPRESS: 'MCX',
  KWIK: 'KWiK',
  BANK_TRANSFER: 'IBAN',
};

function formatAOA(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return `${value} Kz`;
  return (
    new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + ' Kz'
  );
}

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

  const [selectedPlan, setSelectedPlan] = useState<CommercialPlan['code']>('ESSENCIAL');
  const [payMethod, setPayMethod] = useState<PayMethod>('MULTICAIXA_EXPRESS');
  const [customerPhone, setCustomerPhone] = useState('');

  const [partnerName, setPartnerName] = useState('');
  const [partnerCategory, setPartnerCategory] = useState<BenefitPartner['category']>('TELECOM');
  const [partnerDiscount, setPartnerDiscount] = useState('');
  const [generatedApiKey, setGeneratedApiKey] = useState<{ partnerName: string; apiKey: string } | null>(null);
  const [sandboxConfirmPayment, setSandboxConfirmPayment] = useState<ExtendedPayment | null>(null);

  const [offerPartnerId, setOfferPartnerId] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerPromo, setOfferPromo] = useState('');
  const [offerPrice, setOfferPrice] = useState('0.00');

  const loadGlobalCatalogs = async () => {
    try {
      const [planRes, partRes, offerRes] = await Promise.all([
        apiJson<ExtendedPlan[]>('/billing/plans/'),
        apiJson<{ results?: BenefitPartner[] } | BenefitPartner[]>('/benefits/partners/'),
        apiJson<{ results?: BenefitOffer[] } | BenefitOffer[]>('/benefits/offers/'),
      ]);
      setPlans(Array.isArray(planRes) ? planRes : []);
      const partList = Array.isArray(partRes) ? partRes : partRes.results || [];
      const offerList = Array.isArray(offerRes) ? offerRes : offerRes.results || [];
      setPartners(partList);
      setOffers(offerList);
      if (partList.length > 0 && !offerPartnerId) {
        setOfferPartnerId(partList[0].id);
      }
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message || 'Erro ao carregar planos e benefícios.' });
    }
  };

  const loadSchoolBilling = async () => {
    try {
      const qs = schoolId ? `?school=${encodeURIComponent(schoolId)}` : '';
      const [subRes, payRes, invRes] = await Promise.all([
        apiJson<{ results?: ExtendedSubscription[] } | ExtendedSubscription[]>(`/billing/subscriptions/${qs}`),
        apiJson<{ results?: ExtendedPayment[] } | ExtendedPayment[]>(`/billing/payments/${qs}`),
        apiJson<{ results?: AGTInvoice[] } | AGTInvoice[]>(`/billing/invoices/${qs}`),
      ]);

      setSubscriptions(Array.isArray(subRes) ? subRes : subRes.results || []);
      setPayments(Array.isArray(payRes) ? payRes : payRes.results || []);
      setInvoices(Array.isArray(invRes) ? invRes : invRes.results || []);
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message || 'Erro ao carregar faturação da escola.' });
    }
  };

  useEffect(() => {
    loadGlobalCatalogs();
  }, []);

  useEffect(() => {
    loadSchoolBilling();
  }, [schoolId]);

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) {
      onFeedback({ type: 'error', message: 'Selecione primeiro uma escola na barra superior.' });
      return;
    }
    setBusy(true);
    onFeedback(null);
    try {
      const created = await apiJson<ExtendedSubscription>('/billing/subscriptions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school: schoolId, plan_code: selectedPlan }),
      });
      onFeedback({
        type: 'success',
        message: `Subscrição ${created.plan_label} criada (${formatAOA(created.annual_price_aoa)}). Pode agora gerar a referência de pagamento.`,
      });
      await loadSchoolBilling();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleInitiatePayment = async (subscriptionId: string) => {
    if (payMethod !== 'BANK_TRANSFER' && !customerPhone.trim()) {
      onFeedback({
        type: 'error',
        message: `Indique o telemóvel associado ao ${PAY_METHOD_SHORT[payMethod]} antes de gerar a referência.`,
      });
      return;
    }
    setBusy(true);
    onFeedback(null);
    try {
      const payment = await apiJson<ExtendedPayment>('/billing/payments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscriptionId,
          payment_method: payMethod,
          customer_phone: payMethod === 'BANK_TRANSFER' ? '' : customerPhone.trim(),
        }),
      });
      onFeedback({
        type: 'success',
        message: `Referência ${payment.reference} gerada (${payment.method_label} · ${formatAOA(payment.amount_aoa)}).`,
      });
      await loadSchoolBilling();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const executeSandboxConfirm = async () => {
    if (!sandboxConfirmPayment) return;
    setBusy(true);
    onFeedback(null);
    try {
      const res = await apiJson<{ invoice: AGTInvoice }>(
        `/billing/payments/${sandboxConfirmPayment.id}/sandbox-confirm/`,
        { method: 'POST' }
      );
      onFeedback({
        type: 'success',
        message: `Pagamento confirmado em Sandbox! Subscrição ativada e Fatura AGT ${res.invoice.invoice_number} emitida.`,
      });
      setSandboxConfirmPayment(null);
      await loadSchoolBilling();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadSaft = async (format: 'xml' | 'json') => {
    setBusy(true);
    onFeedback(null);
    try {
      const dateSlug = new Date().toISOString().slice(0, 10);
      if (format === 'xml') {
        const res = await authFetch('/billing/invoices/saft-export/?export_format=xml');
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Erro ao gerar ficheiro SAF-T (AO) XML.');
        }
        const xmlText = await res.text();
        const blob = new Blob([xmlText], { type: 'application/xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `saft-ao-edulink-${dateSlug}.xml`;
        a.click();
        URL.revokeObjectURL(url);
        onFeedback({ type: 'success', message: 'Ficheiro oficial SAF-T (AO) XML exportado com sucesso.' });
      } else {
        const saft = await apiJson<Record<string, any>>('/billing/invoices/saft-export/?export_format=json');
        const blob = new Blob([JSON.stringify(saft, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `saft-ao-edulink-${dateSlug}.json`;
        a.click();
        URL.revokeObjectURL(url);
        onFeedback({
          type: 'success',
          message: `Resumo SAF-T (AO) JSON exportado com ${saft.NumberOfEntries} fatura(s).`,
        });
      }
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    onFeedback(null);
    try {
      const partner = await apiJson<BenefitPartner>('/benefits/partners/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: partnerName.trim(),
          category: partnerCategory,
          discount_label: partnerDiscount.trim(),
          eligible_roles: ['STUDENT', 'TEACHER'],
        }),
      });
      setPartnerName('');
      setPartnerDiscount('');
      setOfferPartnerId(partner.id);
      onFeedback({ type: 'success', message: `Parceiro "${partner.name}" registado no Clube de Benefícios.` });
      await loadGlobalCatalogs();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleRotatePartnerKey = async (partner: BenefitPartner) => {
    setBusy(true);
    onFeedback(null);
    try {
      const res = await apiJson<{ api_key: string }>(`/benefits/partners/${partner.id}/rotate-api-key/`, {
        method: 'POST',
      });
      setGeneratedApiKey({ partnerName: partner.name, apiKey: res.api_key });
      onFeedback({
        type: 'success',
        message: `Nova API Key POS gerada para ${partner.name}. Copie-a agora (não voltará a ser exibida).`,
      });
      await loadGlobalCatalogs();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerPartnerId) return;
    setBusy(true);
    onFeedback(null);
    try {
      await apiJson('/benefits/offers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner: offerPartnerId,
          title: offerTitle.trim(),
          promo_code: offerPromo.trim(),
          price_aoa: offerPrice || '0.00',
          requires_active_enrollment: true,
        }),
      });
      setOfferTitle('');
      setOfferPromo('');
      setOfferPrice('0.00');
      onFeedback({ type: 'success', message: 'Oferta publicada no catálogo do Portal do Estudante.' });
      await loadGlobalCatalogs();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Navegação interna para separar Faturação Escolar, Faturas AGT e Clube de Benefícios */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div role="tablist" aria-label="Secções financeiras e benefícios" className="inline-flex rounded-xl bg-stone-100 p-1 gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'billing'}
            onClick={() => setActiveSubTab('billing')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'billing' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Planos &amp; Pagamentos ({subscriptions.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'invoices'}
            onClick={() => setActiveSubTab('invoices')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'invoices' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Faturas AGT ({invoices.length})
          </button>
          {showBenefitsSection && (
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === 'benefits'}
              onClick={() => setActiveSubTab('benefits')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                activeSubTab === 'benefits' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Clube de Benefícios ({partners.length})
            </button>
          )}
        </div>

        {isPlatformAdmin && !schoolId && activeSubTab !== 'benefits' && (
          <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            A exibir todas as escolas — selecione uma na barra superior para filtrar ou contratar plano
          </span>
        )}
      </div>

      {/* SECÇÃO 1: PLANOS & PAGAMENTOS */}
      {activeSubTab === 'billing' && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">Planos Comerciais &amp; Pagamentos em Kwanzas (MCX / KWiK / IBAN)</h2>
            <p className="text-xs text-stone-600">
              Subscrição institucional em AOA com emissão automática de Fatura Eletrónica AGT após liquidação.
            </p>
          </div>

          <form onSubmit={handleCreateSubscription} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div>
              <label htmlFor="edulink-plan-select" className="block text-xs font-semibold text-stone-700 mb-1">
                Plano EduLink (AOA)
              </label>
              <select
                id="edulink-plan-select"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as CommercialPlan['code'])}
                className="edulink-input"
              >
                {plans.length > 0 ? (
                  plans.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label} ({p.billing_type === 'ONE_TIME' || p.code === 'SETUP_DIGITAL' ? 'Taxa Única' : 'Anual'}) — {formatAOA(p.price_aoa)}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="SETUP_DIGITAL">Setup Escola Digital (Taxa Única) — 150.000,00 Kz</option>
                    <option value="ESSENCIAL">EduLink Essencial (Anual) — 240.000,00 Kz</option>
                    <option value="PRO">EduLink Pro (Anual) — 480.000,00 Kz</option>
                    <option value="CAMPUS">EduLink Campus (Anual) — 1.200.000,00 Kz</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label htmlFor="edulink-pay-method" className="block text-xs font-semibold text-stone-700 mb-1">
                Canal de Pagamento
              </label>
              <select
                id="edulink-pay-method"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PayMethod)}
                className="edulink-input"
              >
                <option value="MULTICAIXA_EXPRESS">Multicaixa Express</option>
                <option value="KWIK">KWiK (Transferência Instantânea)</option>
                <option value="BANK_TRANSFER">Transferência IBAN</option>
              </select>
            </div>

            <div>
              <label htmlFor="edulink-pay-phone" className="block text-xs font-semibold text-stone-700 mb-1">
                {payMethod === 'BANK_TRANSFER' ? 'Telemóvel (Opcional para IBAN)' : 'Telemóvel MCX / KWiK'}
              </label>
              <input
                id="edulink-pay-phone"
                type="tel"
                disabled={payMethod === 'BANK_TRANSFER'}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder={payMethod === 'BANK_TRANSFER' ? 'Não aplicável a IBAN' : '+244 923 000 000'}
                className="edulink-input disabled:bg-stone-100 disabled:text-stone-400"
              />
            </div>

            <button
              type="submit"
              disabled={busy || !schoolId}
              className="h-10 rounded-xl bg-teal-700 px-4 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              Contratar Plano
            </button>
          </form>

          <div className="table-wrapper" tabIndex={0} role="region" aria-labelledby="heading-subs">
            <table className="edulink-table">
              <caption id="heading-subs" className="sr-only">Subscrições da escola selecionada</caption>
              <thead>
                <tr>
                  <th scope="col">Plano</th>
                  <th scope="col">Valor / Modalidade</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Vigência</th>
                  <th scope="col">Ação</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-xs text-stone-500 py-4">
                      Nenhuma subscrição registada para esta escola.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => {
                    const isOneTime = sub.billing_type === 'ONE_TIME' || sub.plan_code === 'SETUP_DIGITAL';
                    return (
                      <tr key={sub.id}>
                        <th scope="row" data-label="Plano">{sub.plan_label}</th>
                        <td data-label="Valor / Modalidade">
                          {formatAOA(sub.annual_price_aoa)}{' '}
                          <span className="ml-1 inline-flex rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
                            {isOneTime ? 'Taxa Única' : 'Anual'}
                          </span>
                        </td>
                        <td data-label="Estado">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              sub.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sub.status_label || sub.status}
                          </span>
                        </td>
                        <td data-label="Vigência">
                          {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('pt-AO') : 'Por ativar'}
                        </td>
                        <td data-label="Ação">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleInitiatePayment(sub.id)}
                            className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                          >
                            Gerar Referência {PAY_METHOD_SHORT[payMethod]}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {payments.length > 0 && (
            <div className="table-wrapper" tabIndex={0} role="region" aria-labelledby="heading-payments">
              <table className="edulink-table">
                <caption id="heading-payments" className="sr-only">Pagamentos em Kwanzas</caption>
                <thead>
                  <tr>
                    <th scope="col">Referência</th>
                    <th scope="col">Canal</th>
                    <th scope="col">Montante</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Liquidação / Fatura</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pay) => (
                    <tr key={pay.id}>
                      <th scope="row" data-label="Referência" className="font-mono text-xs">{pay.reference}</th>
                      <td data-label="Canal">{pay.method_label}</td>
                      <td data-label="Montante">{formatAOA(pay.amount_aoa)}</td>
                      <td data-label="Estado">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            pay.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pay.status_label || pay.status}
                        </span>
                      </td>
                      <td data-label="Liquidação / Fatura">
                        {pay.status === 'PENDING' ? (
                          isPlatformAdmin && pay.sandbox_confirm_allowed ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setSandboxConfirmPayment(pay)}
                              className="rounded-lg border border-teal-700 px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50"
                            >
                              Confirmar (Sandbox)
                            </button>
                          ) : (
                            <span className="text-xs text-amber-800 font-medium">
                              Aguardar liquidação {pay.method_label}
                            </span>
                          )
                        ) : (
                          <span className="text-xs font-mono text-stone-700">{pay.invoice_number || 'Liquidado'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* SECÇÃO 2: FATURAÇÃO ELETRÓNICA AGT & SAF-T (AO) */}
      {activeSubTab === 'invoices' && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-stone-900">Faturação Eletrónica AGT &amp; SAF-T (AO)</h2>
              <p className="text-xs text-stone-600">
                Série sequencial anual FT EL2026/2027 com IVA (14%), encadeamento SHA-256 e QR Code fiscal conforme o mandato AGT.
              </p>
            </div>
            {isPlatformAdmin && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDownloadSaft('xml')}
                  className="rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  Exportar SAF-T (AO) XML
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDownloadSaft('json')}
                  className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
                >
                  Resumo JSON
                </button>
              </div>
            )}
          </div>

          <div className="table-wrapper" tabIndex={0} role="region" aria-labelledby="heading-agt">
            <table className="edulink-table">
              <caption id="heading-agt" className="sr-only">Faturas Eletrónicas AGT emitidas</caption>
              <thead>
                <tr>
                  <th scope="col">N.º Fatura</th>
                  <th scope="col">Adquirente</th>
                  <th scope="col">Base + IVA (14%)</th>
                  <th scope="col">Controlo Hash</th>
                  <th scope="col">Documento</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-xs text-stone-500 py-4">
                      Nenhuma fatura AGT emitida ainda.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id}>
                      <th scope="row" data-label="N.º Fatura" className="font-mono text-xs">{inv.invoice_number}</th>
                      <td data-label="Adquirente">{inv.customer_name} (NIF {inv.customer_nif})</td>
                      <td data-label="Base + IVA (14%)">
                        {formatAOA(inv.total_aoa)}{' '}
                        <span className="text-[11px] text-stone-500">(IVA {formatAOA(inv.iva_amount_aoa)})</span>
                      </td>
                      <td data-label="Controlo Hash" className="font-mono text-xs">{inv.hash_control}</td>
                      <td data-label="Documento">
                        <button
                          type="button"
                          onClick={() => openProtectedHtml(`/billing/invoices/${inv.id}/html/`)}
                          className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                        >
                          Imprimir Fatura AGT
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SECÇÃO 3: CLUBE DE BENEFÍCIOS (FASE 2/3) */}
      {showBenefitsSection && activeSubTab === 'benefits' && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-stone-900">Clube de Benefícios Angola (Parceiros &amp; Ofertas)</h2>
              <p className="text-xs text-stone-600">
                {isPlatformAdmin
                  ? 'Gestão global de operadoras (Unitel/Africell), livrarias e bancos com validação via Passaporte Digital QR.'
                  : 'Catálogo nacional de vantagens ativas disponíveis aos estudantes e docentes da instituição no Portal PWA.'}
              </p>
            </div>
            {!isPlatformAdmin && (
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600">
                Gerido pela Administração EduLink
              </span>
            )}
          </div>

          {isPlatformAdmin && generatedApiKey && (
            <AlertBanner
              tone="warning"
              title={`API Key POS — ${generatedApiKey.partnerName} (exibição única)`}
              onDismiss={() => setGeneratedApiKey(null)}
              dismissLabel="Fechar aviso da API Key"
              action={
                <CopyButton
                  key={generatedApiKey.apiKey}
                  value={generatedApiKey.apiKey}
                  label="Copiar Key"
                  copiedLabel="Copiada!"
                  onCopyError={() =>
                    onFeedback({
                      type: 'error',
                      message: 'Não foi possível copiar automaticamente. Selecione e copie a chave manualmente.',
                    })
                  }
                />
              }
            >
              <code className="font-mono bg-white px-2 py-1 rounded border border-amber-200 break-all inline-block text-xs">
                {generatedApiKey.apiKey}
              </code>
            </AlertBanner>
          )}

          {isPlatformAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <form onSubmit={handleCreatePartner} className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <h3 className="text-xs font-bold uppercase tracking-wide text-stone-700">Novo Parceiro Comercial</h3>
                <div>
                  <label htmlFor="partner-name" className="block text-xs font-semibold text-stone-700 mb-1">Nome do Parceiro</label>
                  <input
                    id="partner-name"
                    required
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="Ex.: Unitel Educação"
                    className="edulink-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="partner-category" className="block text-xs font-semibold text-stone-700 mb-1">Categoria</label>
                    <select
                      id="partner-category"
                      value={partnerCategory}
                      onChange={(e) => setPartnerCategory(e.target.value as BenefitPartner['category'])}
                      className="edulink-input"
                    >
                      <option value="TELECOM">Telecom &amp; Dados</option>
                      <option value="BOOKSTORE">Livrarias</option>
                      <option value="SOFTWARE">Software &amp; Formação</option>
                      <option value="BANKING">Banca</option>
                      <option value="TRANSPORT_CULTURE">Transportes &amp; Cultura</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="partner-discount" className="block text-xs font-semibold text-stone-700 mb-1">Destaque</label>
                    <input
                      id="partner-discount"
                      required
                      value={partnerDiscount}
                      onChange={(e) => setPartnerDiscount(e.target.value)}
                      placeholder="Ex.: 50% Bónus Dados"
                      className="edulink-input"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  Registar Parceiro
                </button>
              </form>

              <form onSubmit={handleCreateOffer} className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <h3 className="text-xs font-bold uppercase tracking-wide text-stone-700">Publicar Oferta / Pacote AOA</h3>
                <div>
                  <label htmlFor="offer-partner" className="block text-xs font-semibold text-stone-700 mb-1">Parceiro</label>
                  <select
                    id="offer-partner"
                    value={offerPartnerId}
                    onChange={(e) => setOfferPartnerId(e.target.value)}
                    className="edulink-input"
                  >
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label htmlFor="offer-title" className="block text-xs font-semibold text-stone-700 mb-1">Título</label>
                    <input
                      id="offer-title"
                      required
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      placeholder="Ex.: Pacote Estudante 10GB"
                      className="edulink-input"
                    />
                  </div>
                  <div>
                    <label htmlFor="offer-price" className="block text-xs font-semibold text-stone-700 mb-1">Preço (AOA)</label>
                    <input
                      id="offer-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      className="edulink-input"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="offer-promo" className="block text-xs font-semibold text-stone-700 mb-1">Código Base (opcional)</label>
                  <input
                    id="offer-promo"
                    value={offerPromo}
                    onChange={(e) => setOfferPromo(e.target.value)}
                    placeholder="Ex.: UNITEL-EDU27"
                    className="edulink-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy || partners.length === 0}
                  className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  Publicar Oferta
                </button>
              </form>
            </div>
          )}

          <div className="table-wrapper" tabIndex={0} role="region" aria-labelledby="heading-partners">
            <table className="edulink-table">
              <caption id="heading-partners" className="sr-only">Parceiros e ofertas do Clube de Benefícios</caption>
              <thead>
                <tr>
                  <th scope="col">Parceiro</th>
                  <th scope="col">Vantagem</th>
                  <th scope="col">Ofertas Ativas</th>
                  {isPlatformAdmin && <th scope="col">Integração POS</th>}
                </tr>
              </thead>
              <tbody>
                {partners.length === 0 ? (
                  <tr>
                    <td colSpan={isPlatformAdmin ? 4 : 3} className="text-center text-xs text-stone-500 py-4">
                      Nenhum parceiro configurado ainda.
                    </td>
                  </tr>
                ) : (
                  partners.map((partner) => {
                    const partnerOffers = offers.filter((o) => o.partner === partner.id);
                    return (
                      <tr key={partner.id}>
                        <th scope="row" data-label="Parceiro">{partner.name}</th>
                        <td data-label="Vantagem">{partner.discount_label}</td>
                        <td data-label="Ofertas Ativas">
                          {partnerOffers.length > 0
                            ? partnerOffers
                                .map((o) => `${o.title} (${parseFloat(o.price_aoa) > 0 ? formatAOA(o.price_aoa) : 'QR Grátis'})`)
                                .join(', ')
                            : 'Sem ofertas'}
                        </td>
                        {isPlatformAdmin && (
                          <td data-label="Integração POS">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleRotatePartnerKey(partner)}
                              className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
                            >
                              {partner.has_api_key ? 'Rodar API Key POS' : 'Gerar API Key POS'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ConfirmModal
        open={Boolean(sandboxConfirmPayment)}
        onClose={() => setSandboxConfirmPayment(null)}
        onConfirm={executeSandboxConfirm}
        loading={busy}
        title="Confirmar liquidação em modo Sandbox?"
        description={
          sandboxConfirmPayment
            ? `Referência ${sandboxConfirmPayment.reference} (${formatAOA(sandboxConfirmPayment.amount_aoa)}). Esta ação ativa a subscrição e emite uma Fatura Eletrónica AGT sequencial irreversível.`
            : ''
        }
        confirmLabel="Confirmar e Emitir Fatura AGT"
      />
    </div>
  );
}