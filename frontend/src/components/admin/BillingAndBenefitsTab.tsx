'use client';

import React, { useEffect, useState } from 'react';
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
import { openProtectedHtml } from '@/lib/auth';

interface BillingAndBenefitsTabProps {
  schoolId: string;
  onFeedback: (fb: FeedbackState | null) => void;
}

function formatAOA(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return `${value} Kz`;
  return new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num) + ' Kz';
}

export default function BillingAndBenefitsTab({ schoolId, onFeedback }: BillingAndBenefitsTabProps) {
  const [plans, setPlans] = useState<CommercialPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<SchoolSubscription[]>([]);
  const [payments, setPayments] = useState<KwanzaPayment[]>([]);
  const [invoices, setInvoices] = useState<AGTInvoice[]>([]);
  const [partners, setPartners] = useState<BenefitPartner[]>([]);
  const [offers, setOffers] = useState<BenefitOffer[]>([]);
  const [busy, setBusy] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<CommercialPlan['code']>('ESSENCIAL');
  const [payMethod, setPayMethod] = useState<'MULTICAIXA_EXPRESS' | 'KWIK' | 'BANK_TRANSFER'>('MULTICAIXA_EXPRESS');
  const [customerPhone, setCustomerPhone] = useState('+244923000000');

  const [partnerName, setPartnerName] = useState('');
  const [partnerCategory, setPartnerCategory] = useState<BenefitPartner['category']>('TELECOM');
  const [partnerDiscount, setPartnerDiscount] = useState('');
  const [generatedApiKey, setGeneratedApiKey] = useState<{ partnerName: string; apiKey: string } | null>(null);

  const [offerPartnerId, setOfferPartnerId] = useState('');
  const [offerTitle, setOfferTitle] = useState('');
  const [offerPromo, setOfferPromo] = useState('');
  const [offerPrice, setOfferPrice] = useState('0.00');

  const loadAll = async () => {
    try {
      const [planRes, subRes, payRes, invRes, partRes, offerRes] = await Promise.all([
        apiJson<CommercialPlan[]>('/billing/plans/'),
        apiJson<{ results?: SchoolSubscription[] } | SchoolSubscription[]>('/billing/subscriptions/'),
        apiJson<{ results?: KwanzaPayment[] } | KwanzaPayment[]>('/billing/payments/'),
        apiJson<{ results?: AGTInvoice[] } | AGTInvoice[]>('/billing/invoices/'),
        apiJson<{ results?: BenefitPartner[] } | BenefitPartner[]>('/benefits/partners/'),
        apiJson<{ results?: BenefitOffer[] } | BenefitOffer[]>('/benefits/offers/'),
      ]);

      setPlans(Array.isArray(planRes) ? planRes : []);
      const subList = Array.isArray(subRes) ? subRes : subRes.results || [];
      const payList = Array.isArray(payRes) ? payRes : payRes.results || [];
      const invList = Array.isArray(invRes) ? invRes : invRes.results || [];
      const partList = Array.isArray(partRes) ? partRes : partRes.results || [];
      const offerList = Array.isArray(offerRes) ? offerRes : offerRes.results || [];

      setSubscriptions(schoolId ? subList.filter((s) => s.school === schoolId) : subList);
      setPayments(schoolId ? payList.filter((p) => p.school === schoolId) : payList);
      setInvoices(schoolId ? invList.filter((i) => i.school === schoolId) : invList);
      setPartners(partList);
      setOffers(offerList);
      if (partList.length > 0 && !offerPartnerId) {
        setOfferPartnerId(partList[0].id);
      }
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message || 'Erro ao carregar faturação e benefícios.' });
    }
  };

  useEffect(() => {
    loadAll();
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
      const created = await apiJson<SchoolSubscription>('/billing/subscriptions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school: schoolId, plan_code: selectedPlan }),
      });
      onFeedback({
        type: 'success',
        message: `Subscrição ${created.plan_label} criada (${formatAOA(created.annual_price_aoa)}). Pode agora gerar a referência Multicaixa/KWiK.`,
      });
      await loadAll();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleInitiatePayment = async (subscriptionId: string) => {
    setBusy(true);
    onFeedback(null);
    try {
      const payment = await apiJson<KwanzaPayment>('/billing/payments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscriptionId,
          payment_method: payMethod,
          customer_phone: customerPhone,
        }),
      });
      onFeedback({
        type: 'success',
        message: `Referência ${payment.reference} gerada (${payment.method_label} · ${formatAOA(payment.amount_aoa)}).`,
      });
      await loadAll();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleSandboxConfirm = async (paymentId: string) => {
    setBusy(true);
    onFeedback(null);
    try {
      const res = await apiJson<{ invoice: AGTInvoice }>(`/billing/payments/${paymentId}/sandbox-confirm/`, {
        method: 'POST',
      });
      onFeedback({
        type: 'success',
        message: `Pagamento confirmado em Sandbox! Subscrição ativada e Fatura AGT ${res.invoice.invoice_number} emitida.`,
      });
      await loadAll();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadSaft = async () => {
    setBusy(true);
    try {
      const saft = await apiJson<Record<string, any>>('/billing/invoices/saft-export/');
      const blob = new Blob([JSON.stringify(saft, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saft-ao-yetuedu-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onFeedback({ type: 'success', message: `Exportação SAF-T (AO) gerada com ${saft.NumberOfEntries} fatura(s).` });
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
          name: partnerName,
          category: partnerCategory,
          discount_label: partnerDiscount,
          eligible_roles: ['STUDENT', 'TEACHER'],
        }),
      });
      setPartnerName('');
      setPartnerDiscount('');
      setOfferPartnerId(partner.id);
      onFeedback({ type: 'success', message: `Parceiro "${partner.name}" registado no Clube de Benefícios.` });
      await loadAll();
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
        message: `Nova API Key POS gerada para ${partner.name}. Copie-a já (não voltará a ser exibida).`,
      });
      await loadAll();
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
          title: offerTitle,
          promo_code: offerPromo,
          price_aoa: offerPrice || '0.00',
          requires_active_enrollment: true,
        }),
      });
      setOfferTitle('');
      setOfferPromo('');
      setOfferPrice('0.00');
      onFeedback({ type: 'success', message: 'Oferta publicada no catálogo do Portal do Estudante.' });
      await loadAll();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">1. Planos Comerciais &amp; Pagamentos em Kwanzas (MCX / KWiK)</h2>
            <p className="text-xs text-stone-600">
              Subscrição institucional em AOA com emissão automática de Fatura Eletrónica AGT após liquidação.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateSubscription} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-stone-50 p-4 rounded-xl border border-stone-200">
          <div>
            <label htmlFor="yetu-plan-select" className="block text-xs font-semibold text-stone-700 mb-1">
              Plano YetuEdu (AOA)
            </label>
            <select
              id="yetu-plan-select"
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value as CommercialPlan['code'])}
              className="yetu-input"
            >
              {plans.length > 0 ? (
                plans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label} — {formatAOA(p.price_aoa)}
                  </option>
                ))
              ) : (
                <>
                  <option value="SETUP_DIGITAL">Setup Escola Digital — 150.000,00 Kz</option>
                  <option value="ESSENCIAL">YetuEdu Essencial — 240.000,00 Kz</option>
                  <option value="PRO">YetuEdu Pro — 480.000,00 Kz</option>
                  <option value="CAMPUS">YetuEdu Campus — 1.200.000,00 Kz</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="yetu-pay-method" className="block text-xs font-semibold text-stone-700 mb-1">
              Canal de Pagamento
            </label>
            <select
              id="yetu-pay-method"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as any)}
              className="yetu-input"
            >
              <option value="MULTICAIXA_EXPRESS">Multicaixa Express</option>
              <option value="KWIK">KWiK (Transferência Instantânea)</option>
              <option value="BANK_TRANSFER">Transferência IBAN</option>
            </select>
          </div>

          <div>
            <label htmlFor="yetu-pay-phone" className="block text-xs font-semibold text-stone-700 mb-1">
              Telemóvel MCX / KWiK
            </label>
            <input
              id="yetu-pay-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+244 923 000 000"
              className="yetu-input"
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
          <table className="yetu-table">
            <caption id="heading-subs" className="sr-only">Subscrições da escola selecionada</caption>
            <thead>
              <tr>
                <th scope="col">Plano</th>
                <th scope="col">Valor Anual</th>
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
                subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <th scope="row" data-label="Plano">{sub.plan_label}</th>
                    <td data-label="Valor Anual">{formatAOA(sub.annual_price_aoa)}</td>
                    <td data-label="Estado">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {sub.status}
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
                        className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
                      >
                        Gerar Referência {payMethod === 'KWIK' ? 'KWiK' : 'MCX'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {payments.length > 0 && (
          <div className="table-wrapper" tabIndex={0} role="region" aria-labelledby="heading-payments">
            <table className="yetu-table">
              <caption id="heading-payments" className="sr-only">Pagamentos em Kwanzas</caption>
              <thead>
                <tr>
                  <th scope="col">Referência</th>
                  <th scope="col">Canal</th>
                  <th scope="col">Montante</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Fatura / Simulação</th>
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
                        {pay.status}
                      </span>
                    </td>
                    <td data-label="Fatura / Simulação">
                      {pay.status === 'PENDING' ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleSandboxConfirm(pay.id)}
                          className="rounded-lg border border-teal-700 px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50"
                        >
                          Simular Confirmação (Sandbox)
                        </button>
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

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">2. Faturação Eletrónica AGT &amp; SAF-T (AO)</h2>
            <p className="text-xs text-stone-600">
              Série sequencial FT YE2026 com IVA (14%), encadeamento SHA-256 e QR Code fiscal pronto para o mandato AGT.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleDownloadSaft}
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-50"
          >
            Exportar SAF-T (JSON)
          </button>
        </div>

        <div className="table-wrapper" tabIndex={0} role="region" aria-labelledby="heading-agt">
          <table className="yetu-table">
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

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-stone-900">3. Clube de Benefícios Angola (Parceiros &amp; Ofertas)</h2>
          <p className="text-xs text-stone-600">
            Operadoras (Unitel/Africell), livrarias e bancos com validação via Passaporte Digital QR no Portal ou POS.
          </p>
        </div>

        {generatedApiKey && (
          <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
            <strong>API Key POS ({generatedApiKey.partnerName}):</strong>{' '}
            <code className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200">{generatedApiKey.apiKey}</code>
          </div>
        )}

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
                placeholder="Ex: Unitel Educação"
                className="yetu-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="partner-category" className="block text-xs font-semibold text-stone-700 mb-1">Categoria</label>
                <select
                  id="partner-category"
                  value={partnerCategory}
                  onChange={(e) => setPartnerCategory(e.target.value as any)}
                  className="yetu-input"
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
                  placeholder="Ex: 50% Bónus Dados"
                  className="yetu-input"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
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
                className="yetu-input"
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
                  placeholder="Ex: Pacote Estudante 10GB"
                  className="yetu-input"
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
                  className="yetu-input"
                />
              </div>
            </div>
            <div>
              <label htmlFor="offer-promo" className="block text-xs font-semibold text-stone-700 mb-1">Código Base (opcional)</label>
              <input
                id="offer-promo"
                value={offerPromo}
                onChange={(e) => setOfferPromo(e.target.value)}
                placeholder="Ex: UNITEL-EDU26"
                className="yetu-input"
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

        <div className="table-wrapper" tabIndex={0} role="region" aria-labelledby="heading-partners">
          <table className="yetu-table">
            <caption id="heading-partners" className="sr-only">Parceiros e ofertas do Clube de Benefícios</caption>
            <thead>
              <tr>
                <th scope="col">Parceiro</th>
                <th scope="col">Vantagem</th>
                <th scope="col">Ofertas Ativas</th>
                <th scope="col">Integração POS</th>
              </tr>
            </thead>
            <tbody>
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-xs text-stone-500 py-4">
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
                          ? partnerOffers.map((o) => `${o.title} (${parseFloat(o.price_aoa) > 0 ? formatAOA(o.price_aoa) : 'QR Grátis'})`).join(', ')
                          : 'Sem ofertas'}
                      </td>
                      <td data-label="Integração POS">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRotatePartnerKey(partner)}
                          className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                        >
                          {partner.has_api_key ? 'Rodar API Key POS' : 'Gerar API Key POS'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
