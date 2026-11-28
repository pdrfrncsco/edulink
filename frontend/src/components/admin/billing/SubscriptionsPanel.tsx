'use client';

import React, { useState } from 'react';
import { Card, ConfirmModal } from '@/components/ui';
import { formatAOA } from '@/lib/formatters';
import { apiJson, type AGTInvoice, type CommercialPlan, type FeedbackState } from '../types';
import PaymentsTable from './PaymentsTable';
import SubscriptionForm from './SubscriptionForm';
import SubscriptionsTable from './SubscriptionsTable';
import {
  PAY_METHOD_SHORT,
  type ExtendedPayment,
  type ExtendedPlan,
  type ExtendedSubscription,
  type PayMethod,
} from './types';

interface SubscriptionsPanelProps {
  schoolId: string;
  isPlatformAdmin: boolean;
  plans: ExtendedPlan[];
  subscriptions: ExtendedSubscription[];
  payments: ExtendedPayment[];
  busy: boolean;
  fetching?: boolean;
  onSetBusy: (busy: boolean) => void;
  onReload: () => Promise<void>;
  onFeedback: (fb: FeedbackState | null) => void;
}

/** Commercial plans subscription creator, payment reference generator, and Kwanza ledger. */
export default function SubscriptionsPanel({
  schoolId,
  isPlatformAdmin,
  plans,
  subscriptions,
  payments,
  busy,
  fetching = false,
  onSetBusy,
  onReload,
  onFeedback,
}: SubscriptionsPanelProps) {
  const [selectedPlan, setSelectedPlan] = useState<CommercialPlan['code']>('ESSENCIAL');
  const [payMethod, setPayMethod] = useState<PayMethod>('MULTICAIXA_EXPRESS');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sandboxConfirmPayment, setSandboxConfirmPayment] = useState<ExtendedPayment | null>(null);

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) {
      onFeedback({ type: 'error', message: 'Selecione primeiro uma escola na barra superior.' });
      return;
    }
    onSetBusy(true);
    onFeedback(null);
    try {
      const created = await apiJson<ExtendedSubscription>('/billing/subscriptions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school: schoolId, plan_code: selectedPlan }),
      });
      onFeedback({
        type: 'success',
        message: `Subscrição ${created.plan_label} criada (${formatAOA(
          created.annual_price_aoa
        )}). Pode agora gerar a referência de pagamento.`,
      });
      await onReload();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      onSetBusy(false);
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
    onSetBusy(true);
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
        message: `Referência ${payment.reference} gerada (${payment.method_label} · ${formatAOA(
          payment.amount_aoa
        )}).`,
      });
      await onReload();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      onSetBusy(false);
    }
  };

  const executeSandboxConfirm = async () => {
    if (!sandboxConfirmPayment) return;
    onSetBusy(true);
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
      await onReload();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      onSetBusy(false);
    }
  };

  return (
    <Card padding="md" className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-stone-900">
          Planos Comerciais &amp; Pagamentos em Kwanzas (MCX / KWiK / IBAN)
        </h2>
        <p className="text-xs text-stone-600">
          Subscrição institucional em AOA com emissão automática de Fatura Eletrónica AGT após
          liquidação.
        </p>
      </div>

      <SubscriptionForm
        schoolId={schoolId}
        plans={plans}
        selectedPlan={selectedPlan}
        payMethod={payMethod}
        customerPhone={customerPhone}
        busy={busy}
        onChangePlan={setSelectedPlan}
        onChangePayMethod={setPayMethod}
        onChangePhone={setCustomerPhone}
        onSubmit={handleCreateSubscription}
      />

      <SubscriptionsTable
        subscriptions={subscriptions}
        payMethod={payMethod}
        busy={busy}
        fetching={fetching}
        onInitiatePayment={handleInitiatePayment}
      />

      <PaymentsTable
        payments={payments}
        isPlatformAdmin={isPlatformAdmin}
        busy={busy}
        fetching={fetching}
        onRequestSandboxConfirm={setSandboxConfirmPayment}
      />

      <ConfirmModal
        open={Boolean(sandboxConfirmPayment)}
        onClose={() => setSandboxConfirmPayment(null)}
        onConfirm={executeSandboxConfirm}
        loading={busy}
        title="Confirmar liquidação em modo Sandbox?"
        description={
          sandboxConfirmPayment
            ? `Referência ${sandboxConfirmPayment.reference} (${formatAOA(
                sandboxConfirmPayment.amount_aoa
              )}). Esta ação ativa a subscrição e emite uma Fatura Eletrónica AGT sequencial irreversível.`
            : ''
        }
        confirmLabel="Confirmar e Emitir Fatura AGT"
      />
    </Card>
  );
}
