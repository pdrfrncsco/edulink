'use client';

import React, { useEffect, useState } from 'react';
import { Card, DataTable, StatusBadge, type DataTableColumn } from '@/components/ui';
import ErpConnectionsGrid from './erp/ErpConnectionsGrid';
import ErpConnectorForm from './erp/ErpConnectorForm';
import { buildSampleErpPayload } from './erp/erpSamplePayloads';
import GlobalVerifiersPanel from './GlobalVerifiersPanel';
import {
  apiJson,
  type ERPConnection,
  type ERPSyncEvent,
  type FeedbackState,
  type GlobalVerifierApp,
} from './types';

interface ERPAndVerifiersTabProps {
  schoolId: string;
  onFeedback: (fb: FeedbackState | null) => void;
  onDirectoryUpdated: () => void;
}

/** Phase 2 local ERP webhook connectors (KLASSE/SysPortal/Kacennu) and global verifiers. */
export default function ERPAndVerifiersTab({
  schoolId,
  onFeedback,
  onDirectoryUpdated,
}: ERPAndVerifiersTabProps) {
  const [connections, setConnections] = useState<ERPConnection[]>([]);
  const [events, setEvents] = useState<ERPSyncEvent[]>([]);
  const [verifiers, setVerifiers] = useState<GlobalVerifierApp[]>([]);
  const [erpProvider, setErpProvider] = useState<ERPConnection['provider']>('KLASSE');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(Boolean(schoolId));

  const loadAll = async () => {
    if (!schoolId) {
      setConnections([]);
      setEvents([]);
      setVerifiers([]);
      setFetching(false);
      return;
    }
    setFetching(true);
    try {
      const [connRes, evtRes, verRes] = await Promise.all([
        apiJson<{ results: ERPConnection[] }>(`/erp-sync/connections/?school=${schoolId}`),
        apiJson<{ results: ERPSyncEvent[] }>(`/erp-sync/events/?school=${schoolId}`),
        apiJson<{ results: GlobalVerifierApp[] }>(`/passport/verifiers/?school=${schoolId}`),
      ]);
      setConnections(connRes.results || []);
      setEvents(evtRes.results || []);
      setVerifiers(verRes.results || []);
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    setRevealedSecrets({});
    setApiBaseUrl('');
    loadAll();
  }, [schoolId]);

  const handleCreateERP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setLoading(true);
    onFeedback(null);
    try {
      await apiJson('/erp-sync/connections/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school: schoolId, provider: erpProvider, api_base_url: apiBaseUrl }),
      });
      onFeedback({
        type: 'success',
        message: `Conector ${erpProvider} ativado com chave de segurança.`,
      });
      setApiBaseUrl('');
      await loadAll();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRevealSecret = async (connId: string) => {
    try {
      const res = await apiJson<{ webhook_secret: string }>(
        `/erp-sync/connections/${connId}/reveal-secret/`,
        { method: 'POST' }
      );
      setRevealedSecrets((prev) => ({ ...prev, [connId]: res.webhook_secret }));
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    }
  };

  const handleSimulateERP = async (conn: ERPConnection) => {
    setLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson<ERPSyncEvent>(`/erp-sync/connections/${conn.id}/simulate-event/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSampleErpPayload(conn.provider)),
      });
      onFeedback({
        type: 'success',
        message: `Evento simulado (${conn.provider}): ${res.detail}`,
      });
      await loadAll();
      onDirectoryUpdated();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const eventColumns: DataTableColumn<ERPSyncEvent>[] = [
    {
      key: 'type',
      header: 'ERP / Tipo',
      isRowHeader: true,
      render: (ev) => `${ev.provider} • ${ev.event_type}`,
    },
    {
      key: 'account',
      header: 'Conta',
      cellClassName: 'font-mono text-xs text-teal-800',
      render: (ev) => ev.affected_user_email || '—',
    },
    {
      key: 'status',
      header: 'Estado',
      render: (ev) => (
        <StatusBadge
          tone={
            ev.processing_status === 'PROCESSED'
              ? 'success'
              : ev.processing_status === 'FAILED'
              ? 'error'
              : 'info'
          }
          dot
        >
          {ev.processing_status}
        </StatusBadge>
      ),
    },
    {
      key: 'detail',
      header: 'Detalhe',
      cellClassName: 'text-xs text-stone-600',
      render: (ev) => ev.detail,
    },
  ];

  return (
    <div className="space-y-6">
      <Card padding="lg" className="space-y-6">
        <div className="border-b border-stone-100 pb-4">
          <h2 id="erp-form-heading" className="text-lg font-bold text-stone-900">
            Integração com ERPs Escolares Angolanos
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Ligue o KLASSE, SysPortal ou Kacennu com assinatura de segurança para criar
            matrículas ou suspender acessos por propinas em atraso automaticamente.
          </p>
        </div>

        <ErpConnectorForm
          schoolId={schoolId}
          erpProvider={erpProvider}
          apiBaseUrl={apiBaseUrl}
          loading={loading}
          onChangeProvider={setErpProvider}
          onChangeApiBaseUrl={setApiBaseUrl}
          onSubmit={handleCreateERP}
        />

        <ErpConnectionsGrid
          connections={connections}
          revealedSecrets={revealedSecrets}
          loading={loading}
          onRevealSecret={handleRevealSecret}
          onSimulateEvent={handleSimulateERP}
        />

        <DataTable
          columns={eventColumns}
          data={events}
          getRowKey={(ev) => ev.id}
          caption="Eventos recebidos dos ERPs locais"
          loading={fetching}
          emptyTitle="Nenhum evento ERP registado ainda"
        />
      </Card>

      <GlobalVerifiersPanel
        schoolId={schoolId}
        verifiers={verifiers}
        loading={loading}
        fetching={fetching}
        onSetLoading={setLoading}
        onReload={loadAll}
        onFeedback={onFeedback}
      />
    </div>
  );
}
