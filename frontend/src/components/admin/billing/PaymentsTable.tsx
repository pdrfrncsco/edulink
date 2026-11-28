'use client';

import React from 'react';
import { Button, CopyButton, DataTable, StatusBadge, type DataTableColumn } from '@/components/ui';
import { formatAOA } from '@/lib/formatters';
import type { ExtendedPayment } from './types';

interface PaymentsTableProps {
  payments: ExtendedPayment[];
  isPlatformAdmin: boolean;
  busy: boolean;
  fetching?: boolean;
  onRequestSandboxConfirm: (payment: ExtendedPayment) => void;
}

/** Ledger of generated Kwanza payment references and settlement / AGT invoice state. */
export default function PaymentsTable({
  payments,
  isPlatformAdmin,
  busy,
  fetching = false,
  onRequestSandboxConfirm,
}: PaymentsTableProps) {
  if (payments.length === 0) return null;

  const columns: DataTableColumn<ExtendedPayment>[] = [
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
              onClick={() => onRequestSandboxConfirm(pay)}
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
    <DataTable
      columns={columns}
      data={payments}
      getRowKey={(pay) => pay.id}
      caption="Pagamentos em Kwanzas"
      loading={fetching}
    />
  );
}
