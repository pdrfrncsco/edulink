'use client';

import React from 'react';
import { Button, DataTable, StatusBadge, type DataTableColumn } from '@/components/ui';
import { formatAOA, formatDateAO } from '@/lib/formatters';
import { PAY_METHOD_SHORT, type ExtendedSubscription, type PayMethod } from './types';

interface SubscriptionsTableProps {
  subscriptions: ExtendedSubscription[];
  payMethod: PayMethod;
  busy: boolean;
  fetching?: boolean;
  onInitiatePayment: (subscriptionId: string) => void;
}

/** Table listing institutional subscriptions and triggering Kwanza payment reference generation. */
export default function SubscriptionsTable({
  subscriptions,
  payMethod,
  busy,
  fetching = false,
  onInitiatePayment,
}: SubscriptionsTableProps) {
  const columns: DataTableColumn<ExtendedSubscription>[] = [
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
          onClick={() => onInitiatePayment(sub.id)}
        >
          Gerar Referência {PAY_METHOD_SHORT[payMethod]}
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={subscriptions}
      getRowKey={(sub) => sub.id}
      caption="Subscrições da escola selecionada"
      loading={fetching}
      emptyTitle="Nenhuma subscrição registada para esta escola"
      emptyDescription="Escolha um plano acima para criar uma subscrição e gerar a referência em Kwanzas."
    />
  );
}
