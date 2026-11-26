'use client';

import React, { useEffect, useState } from 'react';
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

export default function ERPAndVerifiersTab({
  schoolId,
  onFeedback,
  onDirectoryUpdated,
}: ERPAndVerifiersTabProps) {
  const [connections, setConnections] = useState<ERPConnection[]>([]);
  const [events, setEvents] = useState<ERPSyncEvent[]>([]);
  const [verifiers, setVerifiers] = useState<GlobalVerifierApp[]>([]);
  const [erpProvider, setErpProvider] = useState<'KLASSE' | 'SYSPORTAL' | 'KACENNU' | 'GENERIC'>('KLASSE');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [verifierType, setVerifierType] = useState<'SHEERID' | 'UNIDAYS' | 'GITHUB_EDUCATION'>('GITHUB_EDUCATION');
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
      onFeedback({ type: 'success', message: `Conector ${erpProvider} ativado com segredo HMAC-SHA256.` });
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
      const res = await apiJson<{ webhook_secret: string }>(`/erp-sync/connections/${connId}/reveal-secret/`, {
        method: 'POST',
      });
      setRevealedSecrets((prev) => ({ ...prev, [connId]: res.webhook_secret }));
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    }
  };

  const handleSimulateERP = async (conn: ERPConnection) => {
    setLoading(true);
    onFeedback(null);
    const samplePayloads: Record<string, any> = {
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

  const handleAddVerifier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setLoading(true);
    onFeedback(null);
    try {
      const created = await apiJson<GlobalVerifierApp>('/passport/verifiers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school: schoolId, verifier: verifierType }),
      });
      await apiJson(`/passport/verifiers/${created.id}/prepare-packet/`, { method: 'POST' });
      onFeedback({ type: 'success', message: `Pacote de credenciação preparado para ${verifierType}!` });
      await loadAll();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareVerifier = async (id: string) => {
    setLoading(true);
    onFeedback(null);
    try {
      await apiJson(`/passport/verifiers/${id}/prepare-packet/`, { method: 'POST' });
      onFeedback({ type: 'success', message: 'Diagnóstico de prontidão atualizado.' });
      await loadAll();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ERPs Angolanos */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="border-b border-stone-100 pb-4">
          <h2 id="erp-form-heading" className="text-lg font-bold text-stone-900">
            Conectores B2B2B — ERPs Escolares Angolanos
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Receba webhooks assinados (HMAC-SHA256) do KLASSE, SysPortal ou Kacennu para criar matrículas ou suspender acessos por propinas em atraso automaticamente.
          </p>
        </div>

        <form onSubmit={handleCreateERP} aria-labelledby="erp-form-heading" className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="erp-provider" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              Software ERP Local
            </label>
            <select
              id="erp-provider"
              name="provider"
              value={erpProvider}
              onChange={(e) => setErpProvider(e.target.value as any)}
              className="yetu-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm bg-white"
            >
              <option value="KLASSE">KLASSE ERP</option>
              <option value="SYSPORTAL">SysPortal Académico</option>
              <option value="KACENNU">Kacennu Gestão Escolar</option>
              <option value="GENERIC">Webhook Genérico JSON</option>
            </select>
          </div>

          <div>
            <label htmlFor="erp-api-url" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              URL da API do ERP (opcional)
            </label>
            <input
              id="erp-api-url"
              name="api_base_url"
              type="url"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://api.erp-escola.ao/v1"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              className="yetu-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={!schoolId || loading}
            className="px-5 py-3 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50"
          >
            Ativar Conector ERP
          </button>
        </form>

        {connections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map((conn) => (
              <div key={conn.id} className="border border-stone-200 rounded-xl p-4 bg-stone-50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-stone-900">{conn.provider}</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[11px]">
                    {conn.last_sync_status}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Endpoint Webhook (Header: X-YetuEdu-Signature):</span>
                  <code className="block font-mono bg-white p-2 rounded border border-stone-200 break-all text-teal-800 mt-1">
                    {conn.webhook_path}
                  </code>
                </div>
                {revealedSecrets[conn.id] && (
                  <div>
                    <span className="text-stone-500 block">Segredo HMAC-SHA256:</span>
                    <code className="block font-mono bg-amber-50 p-2 rounded border border-amber-200 break-all text-amber-900 mt-1">
                      {revealedSecrets[conn.id]}
                    </code>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleRevealSecret(conn.id)}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-semibold text-stone-700 hover:bg-stone-100"
                  >
                    Ver Segredo HMAC
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleSimulateERP(conn)}
                    className="px-3 py-1.5 rounded-lg border border-teal-300 bg-teal-50 font-semibold text-teal-800 hover:bg-teal-100"
                  >
                    Simular Matrícula
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div tabIndex={0} role="region" aria-labelledby="erp-events-caption" className="table-wrapper">
          <table className="yetu-table text-xs sm:text-sm">
            <caption id="erp-events-caption" className="sr-only">
              Eventos recebidos dos ERPs locais
            </caption>
            <thead>
              <tr className="text-xs uppercase text-stone-600 border-b border-stone-200">
                <th className="p-3 font-semibold">ERP / Tipo</th>
                <th className="p-3 font-semibold">Conta</th>
                <th className="p-3 font-semibold">Estado</th>
                <th className="p-3 font-semibold">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-stone-500">
                    Nenhum evento ERP registado ainda.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id}>
                    <th scope="row" className="p-3 text-xs font-semibold text-stone-900">
                      {ev.provider} • {ev.event_type}
                    </th>
                    <td data-label="Conta" className="p-3 font-mono text-xs text-teal-800">
                      {ev.affected_user_email || '—'}
                    </td>
                    <td data-label="Estado" className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        {ev.processing_status}
                      </span>
                    </td>
                    <td data-label="Detalhe" className="p-3 text-xs text-stone-600">
                      {ev.detail}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verificadores Globais */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="border-b border-stone-100 pb-4">
          <h2 id="verifiers-form-heading" className="text-lg font-bold text-stone-900">
            Verificadores Globais (SheerID, UNiDAYS & GitHub Education)
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Prepare o pacote de acreditação institucional (domínio .edu.ao, Schema.org e endpoint público) para desbloquear GitHub Student Pack, Spotify e Google AI.
          </p>
        </div>

        <form onSubmit={handleAddVerifier} aria-labelledby="verifiers-form-heading" className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label htmlFor="verifier-select" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              Plataforma Verificadora
            </label>
            <select
              id="verifier-select"
              name="verifier"
              value={verifierType}
              onChange={(e) => setVerifierType(e.target.value as any)}
              className="yetu-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm bg-white"
            >
              <option value="GITHUB_EDUCATION">GitHub Education Campus (Student Pack)</option>
              <option value="SHEERID">SheerID (Spotify Estudante, Google AI, Autodesk)</option>
              <option value="UNIDAYS">UNiDAYS (Descontos Estudantis Globais)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={!schoolId || loading}
            className="px-5 py-3 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap"
          >
            Preparar Pacote de Credenciação
          </button>
        </form>

        <div tabIndex={0} role="region" aria-labelledby="verifiers-table-caption" className="table-wrapper">
          <table className="yetu-table text-xs sm:text-sm">
            <caption id="verifiers-table-caption" className="sr-only">
              Estado das candidaturas nos verificadores globais
            </caption>
            <thead>
              <tr className="text-xs uppercase text-stone-600 border-b border-stone-200">
                <th className="p-3 font-semibold">Verificador</th>
                <th className="p-3 font-semibold">Estado</th>
                <th className="p-3 font-semibold">Checklist Técnica</th>
                <th className="p-3 font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {verifiers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-stone-500">
                    Nenhuma candidatura iniciada para esta instituição.
                  </td>
                </tr>
              ) : (
                verifiers.map((v) => (
                  <tr key={v.id}>
                    <th scope="row" className="p-3 font-semibold text-stone-900">
                      {v.verifier}
                    </th>
                    <td data-label="Estado" className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800">
                        {v.status}
                      </span>
                    </td>
                    <td data-label="Checklist" className="p-3 text-xs text-stone-600">
                      {v.readiness_snapshot?.checks ? (
                        <span>
                          .edu.ao: {v.readiness_snapshot.checks.official_edu_ao_domain ? 'OK' : 'Pendente'} • DNS:{' '}
                          {v.readiness_snapshot.checks.dns_active ? 'Ativo' : 'Pendente'} • APD:{' '}
                          {v.readiness_snapshot.checks.apd_notified ? 'OK' : 'Pendente'}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td data-label="Ação" className="p-3">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handlePrepareVerifier(v.id)}
                        className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        Reavaliar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
