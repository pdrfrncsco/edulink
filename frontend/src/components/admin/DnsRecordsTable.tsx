'use client';

import React from 'react';
import { Card, CopyButton, DataTable, StatusBadge, type DataTableColumn } from '@/components/ui';
import type { DNSRecord } from './types';

interface DnsRecordsTableProps {
  records: DNSRecord[];
  loading?: boolean;
}

/** Displays DNS blueprint records with Cloudflare sync and propagation status. */
export default function DnsRecordsTable({ records, loading = false }: DnsRecordsTableProps) {
  const columns: DataTableColumn<DNSRecord>[] = [
    {
      key: 'host',
      header: 'Tipo / Host',
      isRowHeader: true,
      cellClassName: 'font-mono text-xs',
      render: (rec) => (
        <div>
          <StatusBadge tone="neutral" mono className="mr-1.5">
            {rec.record_type}
          </StatusBadge>
          <span>{rec.name}</span>
        </div>
      ),
    },
    {
      key: 'purpose',
      header: 'Finalidade',
      cellClassName: 'text-xs',
      render: (rec) => rec.purpose,
    },
    {
      key: 'content',
      header: 'Conteúdo',
      cellClassName: 'font-mono text-xs break-all max-w-md',
      render: (rec) => (
        <div className="flex items-start justify-between gap-2">
          <span>
            {rec.priority !== null ? `[${rec.priority}] ` : ''}
            {rec.content}
          </span>
          <CopyButton value={rec.content} label="Copiar" size="sm" className="shrink-0" />
        </div>
      ),
    },
    {
      key: 'sync',
      header: 'Cloudflare',
      render: (rec) => (
        <StatusBadge tone={rec.sync_state === 'SYNCED' ? 'success' : 'warning'} dot>
          {rec.sync_state}
        </StatusBadge>
      ),
    },
    {
      key: 'propagated',
      header: 'Propagado',
      render: (rec) => (
        <StatusBadge tone={rec.propagated ? 'success' : 'neutral'} dot>
          {rec.propagated ? 'Propagado' : 'Aguardando'}
        </StatusBadge>
      ),
    },
  ];

  return (
    <Card padding="lg" className="space-y-4">
      <h3 id="dns-records-caption" className="text-base font-bold text-stone-900">
        Registos DNS da Zona ({records.length})
      </h3>
      <DataTable
        columns={columns}
        data={records}
        getRowKey={(rec) => rec.id}
        caption="Registos DNS configurados para o domínio .edu.ao"
        labelledBy="dns-records-caption"
        loading={loading}
        emptyTitle="Nenhum registo DNS gerado"
        emptyDescription='Clique em "Inicializar Zona DNS" e depois em "1. Gerar Blueprint DNS".'
      />
    </Card>
  );
}
