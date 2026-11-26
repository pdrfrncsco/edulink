'use client';

import React, { useEffect, useState } from 'react';
import { apiJson, CloudIntegration, FeedbackState, ProvisioningLog } from './types';

interface ProvisioningTabProps {
  schoolId: string;
  onFeedback: (fb: FeedbackState | null) => void;
}

export default function ProvisioningTab({ schoolId, onFeedback }: ProvisioningTabProps) {
  const [integrations, setIntegrations] = useState<CloudIntegration[]>([]);
  const [logs, setLogs] = useState<ProvisioningLog[]>([]);
  const [provider, setProvider] = useState<'GOOGLE' | 'MICROSOFT'>('GOOGLE');
  const [sandboxMode, setSandboxMode] = useState(true);
  const [googleJson, setGoogleJson] = useState('');
  const [delegatedAdmin, setDelegatedAdmin] = useState('');
  const [msTenantId, setMsTenantId] = useState('');
  const [msClientId, setMsClientId] = useState('');
  const [msClientSecret, setMsClientSecret] = useState('');
  const [ssoMetadata, setSsoMetadata] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!schoolId) {
      setIntegrations([]);
      setLogs([]);
      setSsoMetadata(null);
      return;
    }
    try {
      const [intData, logData, ssoData] = await Promise.all([
        apiJson<{ results: CloudIntegration[] }>(`/tenants/integrations/?school=${schoolId}`),
        apiJson<{ results: ProvisioningLog[] }>(`/provisioning/logs/?school=${schoolId}`),
        apiJson<any>(`/auth/sso-metadata/?school_id=${schoolId}`),
      ]);
      setIntegrations(intData.results || []);
      setLogs(logData.results || []);
      setSsoMetadata(ssoData);
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    }
  };

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const handleSaveIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) {
      onFeedback({ type: 'error', message: 'Selecione uma escola primeiro.' });
      return;
    }
    setLoading(true);
    onFeedback(null);

    try {
      let credentials_payload: any = {};
      if (provider === 'GOOGLE') {
        if (sandboxMode) {
          credentials_payload = { sandbox: true, delegated_admin_email: delegatedAdmin || undefined };
        } else {
          const parsed = JSON.parse(googleJson);
          if (delegatedAdmin) parsed.delegated_admin_email = delegatedAdmin;
          credentials_payload = parsed;
        }
      } else {
        credentials_payload = sandboxMode
          ? { sandbox: true }
          : { tenant_id: msTenantId, client_id: msClientId, client_secret: msClientSecret };
      }

      const existing = integrations.find((i) => i.provider === provider);
      if (existing) {
        await apiJson(`/tenants/integrations/${existing.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sync_enabled: true, credentials_payload }),
        });
      } else {
        await apiJson('/tenants/integrations/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ school: schoolId, provider, sync_enabled: true, credentials_payload }),
        });
      }

      onFeedback({
        type: 'success',
        message: `Credenciais ${provider} encriptadas (AES-256/Fernet) e guardadas com segurança!`,
      });
      await loadData();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message || 'Erro ao guardar integração.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (integrationId: string) => {
    setLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson(`/provisioning/test-connection/${integrationId}/`, { method: 'POST' });
      onFeedback({
        type: 'success',
        message: `Ligação verificada com sucesso (${res.details?.status || 'OK'}).`,
        details: res.details,
      });
      await loadData();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
      await loadData();
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSync = async () => {
    if (!schoolId) return;
    setLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson(`/provisioning/sync-school/${schoolId}/`, { method: 'POST' });
      onFeedback({
        type: 'success',
        message: `${res.message} (Task Celery: ${res.task_id})`,
      });
      setTimeout(loadData, 1500);
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Integration Config Form */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h2 id="cloud-form-heading" className="text-lg font-bold text-stone-900">
              Conectores Cloud (Google Admin SDK & Microsoft Graph)
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              As credenciais são encriptadas com Fernet (AES-256) antes de serem persistidas na base de dados.
            </p>
          </div>
          <button
            type="button"
            disabled={!schoolId || integrations.length === 0 || loading}
            onClick={handleBatchSync}
            className="px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs sm:text-sm font-semibold hover:bg-teal-800 disabled:opacity-50 shadow-sm"
          >
            Sincronizar Escola em Massa (Celery)
          </button>
        </div>

        {/* Active Integrations Cards */}
        {integrations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map((intg) => (
              <div key={intg.id} className="border border-stone-200 rounded-xl p-4 bg-stone-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-stone-900">
                    {intg.provider === 'GOOGLE' ? 'Google Workspace for Education' : 'Microsoft 365 (Entra ID)'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      intg.sync_status === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : intg.sync_status === 'ERROR'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {intg.sync_status}
                  </span>
                </div>
                {intg.last_error_message && (
                  <p className="text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200 break-words">
                    {intg.last_error_message}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-stone-500">
                    {intg.last_sync_at ? `Última sync: ${new Date(intg.last_sync_at).toLocaleString('pt-AO')}` : 'Nunca sincronizado'}
                  </span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleTestConnection(intg.id)}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-100"
                  >
                    Testar Ligação
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSaveIntegration} aria-labelledby="cloud-form-heading" className="space-y-4 pt-2">
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase text-stone-700">Selecione o Provedor de Nuvem</legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="cloud_provider"
                  value="GOOGLE"
                  checked={provider === 'GOOGLE'}
                  onChange={() => setProvider('GOOGLE')}
                  className="accent-teal-700"
                />
                <span>Google Workspace (Service Account)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="cloud_provider"
                  value="MICROSOFT"
                  checked={provider === 'MICROSOFT'}
                  onChange={() => setProvider('MICROSOFT')}
                  className="accent-teal-700"
                />
                <span>Microsoft 365 Education (Entra ID)</span>
              </label>
            </div>
          </fieldset>

          <div className="flex items-center gap-2">
            <input
              id="sandbox-mode-check"
              name="sandbox_mode"
              type="checkbox"
              checked={sandboxMode}
              onChange={(e) => setSandboxMode(e.target.checked)}
              className="accent-teal-700 w-4 h-4"
            />
            <label htmlFor="sandbox-mode-check" className="text-sm text-stone-700">
              Executar em modo Sandbox (simulação segura sem credenciais reais de produção)
            </label>
          </div>

          {provider === 'GOOGLE' ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="google-delegated-admin" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
                  E-mail Super Admin Google (Domain-Wide Delegation)
                </label>
                <input
                  id="google-delegated-admin"
                  name="delegated_admin_email"
                  type="email"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="admin@colegio-esperanca.edu.ao"
                  value={delegatedAdmin}
                  onChange={(e) => setDelegatedAdmin(e.target.value)}
                  className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono"
                />
              </div>
              {!sandboxMode && (
                <div>
                  <label htmlFor="google-sa-json" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
                    JSON da Service Account (Google Cloud) <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="google-sa-json"
                    name="google_sa_json"
                    rows={4}
                    required={!sandboxMode}
                    placeholder='{"type": "service_account", "client_email": "...", "private_key": "..."}'
                    value={googleJson}
                    onChange={(e) => setGoogleJson(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-mono"
                  />
                </div>
              )}
            </div>
          ) : (
            !sandboxMode && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="ms-tenant" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
                    Tenant ID (Entra ID) <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="ms-tenant"
                    name="ms_tenant_id"
                    type="text"
                    required
                    value={msTenantId}
                    onChange={(e) => setMsTenantId(e.target.value)}
                    className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="ms-client" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
                    Client ID (App Registration) <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="ms-client"
                    name="ms_client_id"
                    type="text"
                    required
                    value={msClientId}
                    onChange={(e) => setMsClientId(e.target.value)}
                    className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="ms-secret" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
                    Client Secret <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="ms-secret"
                    name="ms_client_secret"
                    type="password"
                    required
                    value={msClientSecret}
                    onChange={(e) => setMsClientSecret(e.target.value)}
                    className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-mono"
                  />
                </div>
              </div>
            )
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!schoolId || loading}
              className="px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50"
            >
              Guardar Integração Encriptada
            </button>
          </div>
        </form>
      </div>

      {/* Keycloak SSO & Canva for Education */}
      {ssoMetadata && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Keycloak SSO (OIDC & SAML 2.0 para Canva Educação)
              </h3>
              <p className="text-xs text-stone-500">
                Identidade única institucional para portais EduLink e ativação SAML 2.0 no Canva para Educação.
              </p>
            </div>
            <button
              type="button"
              disabled={!schoolId || loading}
              onClick={async () => {
                setLoading(true);
                onFeedback(null);
                try {
                  const res = await apiJson(`/auth/sync-keycloak/${schoolId}/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  });
                  onFeedback({
                    type: 'success',
                    message: `Keycloak SSO sincronizado: ${res.synced_count} utilizador(es) no realm ${res.realm}.`,
                  });
                } catch (err: any) {
                  onFeedback({ type: 'error', message: err.message });
                } finally {
                  setLoading(false);
                }
              }}
              className="px-4 py-2 rounded-xl border border-teal-300 bg-teal-50 text-teal-800 text-xs font-semibold hover:bg-teal-100"
            >
              Sincronizar Utilizadores no Keycloak
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-1">
              <span className="font-bold text-stone-700 uppercase block">SAML 2.0 IdP Metadata (Canva)</span>
              <code className="block font-mono text-teal-800 break-all">{ssoMetadata.saml_idp_metadata_url}</code>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-1">
              <span className="font-bold text-stone-700 uppercase block">OIDC Discovery (Realm {ssoMetadata.realm})</span>
              <code className="block font-mono text-teal-800 break-all">{ssoMetadata.oidc_discovery_url}</code>
            </div>
          </div>
        </div>
      )}

      {/* Provisioning Audit Logs */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 id="provisioning-logs-caption" className="text-base font-bold text-stone-900">
            Histórico de Provisionamento & Revogações ({logs.length})
          </h3>
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Atualizar Logs
          </button>
        </div>

        <div tabIndex={0} role="region" aria-labelledby="provisioning-logs-caption" className="table-wrapper">
          <table className="edulink-table text-xs sm:text-sm">
            <caption className="sr-only">Logs auditáveis de provisionamento cloud</caption>
            <thead>
              <tr className="text-xs uppercase text-stone-600 border-b border-stone-200">
                <th className="p-3 font-semibold">Conta / Destino</th>
                <th className="p-3 font-semibold">Provedor</th>
                <th className="p-3 font-semibold">Ação</th>
                <th className="p-3 font-semibold">Estado</th>
                <th className="p-3 font-semibold">ID Externo</th>
                <th className="p-3 font-semibold">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-stone-500">
                    Sem registos de provisionamento até ao momento.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/70">
                    <th scope="row" className="p-3 font-mono text-xs text-stone-900">
                      {log.institutional_email || 'Ligação Institucional'}
                    </th>
                    <td data-label="Provedor" className="p-3 font-semibold text-stone-700">
                      {log.provider}
                    </td>
                    <td data-label="Ação" className="p-3 text-stone-700">
                      {log.action}
                    </td>
                    <td data-label="Estado" className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'SANDBOX'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td data-label="ID Externo" className="p-3 font-mono text-xs text-stone-600">
                      {log.external_id || '—'}
                    </td>
                    <td data-label="Data" className="p-3 text-xs text-stone-500">
                      {new Date(log.created_at).toLocaleString('pt-AO')}
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
