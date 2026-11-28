'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Card, DataTable, StatusBadge, type DataTableColumn } from '@/components/ui';
import { formatDateTimeAO } from '@/lib/formatters';
import type { ProvisioningLog } from '../types';

interface ProvisioningLogsTableProps {
  logs: ProvisioningLog[];
  loading?: boolean;
  onRefresh: () => void;
}

/** Auditable Google/Microsoft provisioning and revocation history table. */
export default function ProvisioningLogsTable({
  logs,
  loading = false,
  onRefresh,
}: ProvisioningLogsTableProps) {
  const columns: DataTableColumn<ProvisioningLog>[] = [
    {
      key: 'email',
      header: 'Conta / Destino',
      isRowHeader: true,
      cellClassName: 'font-mono text-xs text-stone-900',
      render: (log) => log.institutional_email || 'Ligação Institucional',
    },
    {
      key: 'provider',
      header: 'Provedor',
      cellClassName: 'font-semibold',
      render: (log) => log.provider,
    },
    {
      key: 'action',
      header: 'Ação',
      render: (log) => log.action,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (log) => (
        <StatusBadge
          tone={log.status === 'SUCCESS' ? 'success' : log.status === 'SANDBOX' ? 'info' : 'error'}
          dot
        >
          {log.status}
        </StatusBadge>
      ),
    },
    {
      key: 'external_id',
      header: 'ID Externo',
      cellClassName: 'font-mono text-xs text-stone-600',
      render: (log) => log.external_id || '—',
    },
    {
      key: 'date',
      header: 'Data',
      cellClassName: 'text-xs text-stone-500',
      render: (log) => formatDateTimeAO(log.created_at),
    },
  ];

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id="provisioning-logs-caption" className="text-base font-bold text-stone-900">
          Histórico de Provisionamento &amp; Revogações ({logs.length})
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Atualizar Logs
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        getRowKey={(log) => log.id}
        caption="Logs auditáveis de provisionamento cloud"
        labelledBy="provisioning-logs-caption"
        loading={loading}
        emptyTitle="Sem registos de provisionamento até ao momento"
      />
    </Card>
  );
}
