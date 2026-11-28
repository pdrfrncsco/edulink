'use client';

import React, { useState } from 'react';
import {
  Button,
  Card,
  ConfirmModal,
  CopyButton,
  DataTable,
  FormField,
  Input,
  Select,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui';
import { formatAOA, formatDateAO } from '@/lib/formatters';
import { apiJson, type AGTInvoice, type CommercialPlan, type FeedbackState } from '../types';
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

  const subscriptionColumns: DataTableColumn<ExtendedSubscription>[] = [
    {
      key: 'plan',
      header: 'Plano',
      isRowHeader: true,
      render: (sub) => sub.plan_label,
    },
    {
      key: 'amount',
      header: 'Valor / Modalidade',
      render: (sub) => {
        const isOneTime = sub.billing_type === 'ONE_TIME' || sub.plan_code === 'SETUP_DIGITAL';
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono font-semibold">{formatAOA(sub.annual_price_aoa)}</span>
            <StatusBadge tone="neutral">{isOneTime ? 'Taxa Única' : 'Anual'}</StatusBadge>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      render: (sub) => (
        <StatusBadge tone={sub.status === 'ACTIVE' ? 'success' : 'warning'} dot>
          {sub.status_label || sub.status}
        </StatusBadge>
      ),
    },
    {
      key: 'expires',
      header: 'Vigência',
      render: (sub) => (sub.expires_at ? formatDateAO(sub.expires_at) : 'Por ativar'),
    },
    {
      key: 'action',
      header: 'Ação',
      render: (sub) => (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => handleInitiatePayment(sub.id)}
        >
          Gerar Referência {PAY_METHOD_SHORT[payMethod]}
        </Button>
      ),
    },
  ];

  const paymentColumns: DataTableColumn<ExtendedPayment>[] = [
    {
      key: 'reference',
      header: 'Referência',
      isRowHeader: true,
      cellClassName: 'font-mono text-xs',
      render: (pay) => (
        <div className="inline-flex items-center gap-1.5">
          <span>{pay.reference}</span>
          <CopyButton value={pay.reference} label="Copiar" copiedLabel="Copiada" size="sm" />
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Canal',
      render: (pay) => pay.method_label,
    },
    {
      key: 'amount',
      header: 'Montante',
      cellClassName: 'font-mono',
      render: (pay) => formatAOA(pay.amount_aoa),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (pay) => (
        <StatusBadge tone={pay.status === 'CONFIRMED' ? 'success' : 'warning'} dot>
          {pay.status_label || pay.status}
        </StatusBadge>
      ),
    },
    {
      key: 'settlement',
      header: 'Liquidação / Fatura',
      render: (pay) =>
        pay.status === 'PENDING' ? (
          isPlatformAdmin && pay.sandbox_confirm_allowed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setSandboxConfirmPayment(pay)}
            >
              Confirmar (Sandbox)
            </Button>
          ) : (
            <span className="text-xs text-amber-800 font-medium">
              Aguardar liquidação {pay.method_label}
            </span>
          )
        ) : (
          <span className="text-xs font-mono text-stone-700">
            {pay.invoice_number || 'Liquidado'}
          </span>
        ),
    },
  ];

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

      <form
        onSubmit={handleCreateSubscription}
        className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-stone-50 p-4 rounded-xl border border-stone-200"
      >
        <FormField id="edulink-plan-select" label="Plano EduLink (AOA)">
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              invalid={invalid}
              aria-describedby={describedBy}
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value as CommercialPlan['code'])}
            >
              {plans.length > 0 ? (
                plans.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label} (
                    {p.billing_type === 'ONE_TIME' || p.code === 'SETUP_DIGITAL'
                      ? 'Taxa Única'
                      : 'Anual'}
                    ) — {formatAOA(p.price_aoa)}
                  </option>
                ))
              ) : (
                <>
                  <option value="SETUP_DIGITAL">
                    Setup Escola Digital (Taxa Única) — 150.000,00 Kz
                  </option>
                  <option value="ESSENCIAL">EduLink Essencial (Anual) — 240.000,00 Kz</option>
                  <option value="PRO">EduLink Pro (Anual) — 480.000,00 Kz</option>
                  <option value="CAMPUS">EduLink Campus (Anual) — 1.200.000,00 Kz</option>
                </>
              )}
            </Select>
          )}
        </FormField>

        <FormField id="edulink-pay-method" label="Canal de Pagamento">
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              invalid={invalid}
              aria-describedby={describedBy}
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PayMethod)}
            >
              <option value="MULTICAIXA_EXPRESS">Multicaixa Express</option>
              <option value="KWIK">KWiK (Transferência Instantânea)</option>
              <option value="BANK_TRANSFER">Transferência IBAN</option>
            </Select>
          )}
        </FormField>

        <FormField
          id="edulink-pay-phone"
          label={payMethod === 'BANK_TRANSFER' ? 'Telemóvel (Opcional para IBAN)' : 'Telemóvel MCX / KWiK'}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="tel"
              invalid={invalid}
              aria-describedby={describedBy}
              disabled={payMethod === 'BANK_TRANSFER'}
              autoComplete="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder={payMethod === 'BANK_TRANSFER' ? 'Não aplicável a IBAN' : '+244 923 000 000'}
              className="disabled:bg-stone-100 disabled:text-stone-400"
            />
          )}
        </FormField>

        <Button type="submit" loading={busy} disabled={!schoolId} size="lg">
          Contratar Plano
        </Button>
      </form>

      <DataTable
        columns={subscriptionColumns}
        data={subscriptions}
        getRowKey={(sub) => sub.id}
        caption="Subscrições da escola selecionada"
        emptyTitle="Nenhuma subscrição registada para esta escola"
        emptyDescription="Escolha um plano acima para criar uma subscrição e gerar a referência em Kwanzas."
      />

      {payments.length > 0 && (
        <DataTable
          columns={paymentColumns}
          data={payments}
          getRowKey={(pay) => pay.id}
          caption="Pagamentos em Kwanzas"
        />
      )}

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
