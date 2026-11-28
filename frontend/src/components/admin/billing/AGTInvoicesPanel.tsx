'use client';

import React from 'react';
import { FileCode2, FileJson, Printer } from 'lucide-react';
import { Button, Card, DataTable, type DataTableColumn } from '@/components/ui';
import { authFetch, openProtectedHtml } from '@/lib/auth';
import { formatAOA } from '@/lib/formatters';
import { apiJson, type AGTInvoice, type FeedbackState } from '../types';

interface AGTInvoicesPanelProps {
  invoices: AGTInvoice[];
  isPlatformAdmin: boolean;
  busy: boolean;
  fetching?: boolean;
  onSetBusy: (busy: boolean) => void;
  onFeedback: (fb: FeedbackState | null) => void;
}

/** Electronic AGT invoices ledger and Platform-Admin-only SAF-T (AO) export controls. */
export default function AGTInvoicesPanel({
  invoices,
  isPlatformAdmin,
  busy,
  fetching = false,
  onSetBusy,
  onFeedback,
}: AGTInvoicesPanelProps) {
  const handleDownloadSaft = async (format: 'xml' | 'json') => {
    onSetBusy(true);
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
        onFeedback({
          type: 'success',
          message: 'Ficheiro oficial SAF-T (AO) XML exportado com sucesso.',
        });
      } else {
        const saft = await apiJson<Record<string, any>>(
          '/billing/invoices/saft-export/?export_format=json'
        );
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
      onSetBusy(false);
    }
  };

  const columns: DataTableColumn<AGTInvoice>[] = [
    {
      key: 'invoice_number',
      header: 'N.º Fatura',
      isRowHeader: true,
      cellClassName: 'font-mono text-xs',
      render: (inv) => inv.invoice_number,
    },
    {
      key: 'customer',
      header: 'Adquirente',
      render: (inv) => `${inv.customer_name} (NIF ${inv.customer_nif})`,
    },
    {
      key: 'total',
      header: 'Base + IVA (14%)',
      render: (inv) => (
        <div>
          <span className="font-mono font-semibold">{formatAOA(inv.total_aoa)}</span>{' '}
          <span className="text-[11px] text-stone-500">(IVA {formatAOA(inv.iva_amount_aoa)})</span>
        </div>
      ),
    },
    {
      key: 'hash',
      header: 'Controlo Hash',
      cellClassName: 'font-mono text-xs',
      render: (inv) => inv.hash_control,
    },
    {
      key: 'document',
      header: 'Documento',
      render: (inv) => (
        <Button
          type="button"
          size="sm"
          leftIcon={<Printer className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={() =>
            openProtectedHtml(`/billing/invoices/${inv.id}/html/`).catch((err) =>
              onFeedback({ type: 'error', message: err.message })
            )
          }
        >
          Imprimir Fatura AGT
        </Button>
      ),
    },
  ];

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-stone-900">
            Faturação Eletrónica AGT &amp; SAF-T (AO)
          </h2>
          <p className="text-xs text-stone-600">
            Série sequencial anual FT EL2026/2027 com IVA (14%), encadeamento SHA-256 e QR Code
            fiscal conforme o mandato AGT.
          </p>
        </div>
        {isPlatformAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              leftIcon={<FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => handleDownloadSaft('xml')}
            >
              Exportar SAF-T (AO) XML
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              leftIcon={<FileJson className="h-3.5 w-3.5" aria-hidden="true" />}
              onClick={() => handleDownloadSaft('json')}
            >
              Resumo JSON
            </Button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        getRowKey={(inv) => inv.id}
        caption="Faturas Eletrónicas AGT emitidas"
        loading={fetching}
        emptyTitle="Nenhuma fatura AGT emitida ainda"
        emptyDescription="As faturas são emitidas automaticamente após a confirmação dos pagamentos em Kwanzas."
      />
    </Card>
  );
}
