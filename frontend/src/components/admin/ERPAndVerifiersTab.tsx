'use client';

import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  CopyButton,
  DataTable,
  FormField,
  Input,
  Select,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui';
import GlobalVerifiersPanel from './GlobalVerifiersPanel';
import {
  apiJson,
  ERPConnection,
  ERPSyncEvent,
  FeedbackState,
  GlobalVerifierApp,
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
  const [erpProvider, setErpProvider] = useState<'KLASSE' | 'SYSPORTAL' | 'KACENNU' | 'GENERIC'>(
    'KLASSE'
  );
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    if (!schoolId) {
      setConnections([]);
      setEvents([]);
      setVerifiers([]);
      return;
    }
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
        message: `Conector ${erpProvider} ativado com segredo HMAC-SHA256.`,
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
    const samplePayloads: Record<string, unknown> = {
      KLASSE: {
        event_id: `sim-klasse-${Date.now()}`,
        evento: 'matricula.criada',
        aluno: {
          nome_completo: 'Simão Domingos Neto',
          bi: `SIM-${Date.now().toString().slice(-5)}`,
          turma: '11ª Classe - A',
          ano_letivo: '2026/2027',
        },
      },
      SYSPORTAL: {
        event_id: `sim-sys-${Date.now()}`,
        event: 'enrollment.active',
        student: {
          name: 'Teresa Lukeni Simão',
          document_id: `SYS-${Date.now().toString().slice(-5)}`,
          class_name: '10ª Classe - B',
          year: '2026/2027',
        },
      },
      KACENNU: {
        id_transacao: `sim-kac-${Date.now()}`,
        tipo_evento: 'INSCRICAO',
        dados: {
          nome: 'José Kandimba',
          numero_processo: `KAC-${Date.now().toString().slice(-5)}`,
          classe: '12ª Classe',
          ano_academico: '2026/2027',
        },
      },
      GENERIC: {
        event_id: `sim-gen-${Date.now()}`,
        event_type: 'STUDENT_ENROLLED',
        user: {
          full_name: 'Ana Paulo Teste',
          bi_or_student_id: `GEN-${Date.now().toString().slice(-5)}`,
          grade_class: '1º Ano TI',
          academic_year: '2026/2027',
        },
      },
    };

    try {
      const res = await apiJson<ERPSyncEvent>(`/erp-sync/connections/${conn.id}/simulate-event/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayloads[conn.provider] || samplePayloads.GENERIC),
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
            Conectores B2B2B — ERPs Escolares Angolanos
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Receba webhooks assinados (HMAC-SHA256) do KLASSE, SysPortal ou Kacennu para criar
            matrículas ou suspender acessos por propinas em atraso automaticamente.
          </p>
        </div>

        <form
          onSubmit={handleCreateERP}
          aria-labelledby="erp-form-heading"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
        >
          <FormField id="erp-provider" label="Software ERP Local">
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                name="provider"
                invalid={invalid}
                aria-describedby={describedBy}
                value={erpProvider}
                onChange={(e) => setErpProvider(e.target.value as typeof erpProvider)}
              >
                <option value="KLASSE">KLASSE ERP</option>
                <option value="SYSPORTAL">SysPortal Académico</option>
                <option value="KACENNU">Kacennu Gestão Escolar</option>
                <option value="GENERIC">Webhook Genérico JSON</option>
              </Select>
            )}
          </FormField>

          <FormField id="erp-api-url" label="URL da API do ERP (opcional)">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="api_base_url"
                type="url"
                mono
                invalid={invalid}
                aria-describedby={describedBy}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="https://api.erp-escola.ao/v1"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
              />
            )}
          </FormField>

          <Button type="submit" size="lg" disabled={!schoolId} loading={loading}>
            Ativar Conector ERP
          </Button>
        </form>

        {connections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map((conn) => (
              <Card key={conn.id} variant="muted" padding="sm" className="rounded-xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-stone-900">{conn.provider}</span>
                  <StatusBadge tone="brand" dot>
                    {conn.last_sync_status}
                  </StatusBadge>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-stone-500">
                      Endpoint Webhook (Header: X-EduLink-Signature):
                    </span>
                    <CopyButton value={conn.webhook_path} label="Copiar" size="sm" />
                  </div>
                  <code className="block font-mono bg-white p-2 rounded border border-stone-200 break-all text-teal-800 mt-1">
                    {conn.webhook_path}
                  </code>
                </div>
                {revealedSecrets[conn.id] && (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-stone-500">Segredo HMAC-SHA256:</span>
                      <CopyButton value={revealedSecrets[conn.id]} label="Copiar" size="sm" />
                    </div>
                    <code className="block font-mono bg-amber-50 p-2 rounded border border-amber-200 break-all text-amber-900 mt-1">
                      {revealedSecrets[conn.id]}
                    </code>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevealSecret(conn.id)}
                  >
                    Ver Segredo HMAC
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => handleSimulateERP(conn)}
                  >
                    Simular Matrícula
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <DataTable
          columns={eventColumns}
          data={events}
          getRowKey={(ev) => ev.id}
          caption="Eventos recebidos dos ERPs locais"
          emptyTitle="Nenhum evento ERP registado ainda"
        />
      </Card>

      <GlobalVerifiersPanel
        schoolId={schoolId}
        verifiers={verifiers}
        loading={loading}
        onSetLoading={setLoading}
        onReload={loadAll}
        onFeedback={onFeedback}
      />
    </div>
  );
}
