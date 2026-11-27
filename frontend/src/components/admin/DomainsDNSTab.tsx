'use client';

import React, { useEffect, useState } from 'react';
import { apiJson, DomainConfig, FeedbackState } from './types';

interface DomainsDNSTabProps {
  schoolId: string;
  hasOfficialDomain?: boolean;
  onFeedback: (fb: FeedbackState | null) => void;
}

export default function DomainsDNSTab({ schoolId, hasOfficialDomain = true, onFeedback }: DomainsDNSTabProps) {
  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [dossier, setDossier] = useState<any | null>(null);
  const [googleToken, setGoogleToken] = useState('');
  const [msToken, setMsToken] = useState('');
  const [dkimSelector, setDkimSelector] = useState('google');
  const [dkimKey, setDkimKey] = useState('');
  const [webTarget, setWebTarget] = useState('sites.edulink.ao');
  const [cfAccountId, setCfAccountId] = useState('');
  const [loading, setLoading] = useState(false);

  const loadConfig = async () => {
    if (!schoolId) {
      setConfig(null);
      setDossier(null);
      return;
    }
    try {
      const data = await apiJson<{ results: DomainConfig[] }>(`/domains/configs/?school=${schoolId}`);
      const first = (data.results || [])[0] || null;
      setConfig(first);
      if (first) {
        setGoogleToken(first.google_verification_token || '');
        setMsToken(first.microsoft_verification_token || '');
        setDkimSelector(first.dkim_selector || 'google');
        setDkimKey(first.dkim_public_key || '');
        setWebTarget(first.target_web_ip_or_cname || 'sites.edulink.ao');
        setCfAccountId(first.cloudflare_account_id || '');
      }
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    }
  };

  useEffect(() => {
    loadConfig();
  }, [schoolId]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setLoading(true);
    onFeedback(null);

    const payload = {
      school: schoolId,
      google_verification_token: googleToken,
      microsoft_verification_token: msToken,
      dkim_selector: dkimSelector,
      dkim_public_key: dkimKey,
      target_web_ip_or_cname: webTarget,
      cloudflare_account_id: cfAccountId,
    };

    try {
      if (config) {
        const updated = await apiJson<DomainConfig>(`/domains/configs/${config.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setConfig(updated);
      } else {
        const created = await apiJson<DomainConfig>('/domains/configs/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setConfig(created);
      }
      onFeedback({ type: 'success', message: 'Configuração DNS guardada com sucesso!' });
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (path: string, method: 'POST' | 'GET', successMessage: string, body?: any) => {
    setLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (path.endsWith('dns-ao-dossier/')) {
        setDossier(res);
      }
      onFeedback({ type: 'success', message: successMessage, details: res.nameservers ? { next_steps: res.nameservers.map((ns: string) => `NS: ${ns}`), domain: res.domain, school_id: res.zone_id } : undefined });
      await loadConfig();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!hasOfficialDomain && (
        <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
          <strong>Modo Demonstração ativo:</strong> esta escola ainda utiliza o endereço provisório <code>.edulink.ao</code> e não tem domínio definitivo (<code>.edu.ao</code>) atribuído. Defina o domínio oficial na consola de Operação EduLink antes de gerar ou sincronizar registos DNS na Cloudflare.
        </div>
      )}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h2 id="dns-form-heading" className="text-lg font-bold text-stone-900">
              Automação DNS (.edu.ao) — Cloudflare & DNS.AO
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Gera automaticamente registos Web, MX, SPF combinado, DKIM e DMARC para aprovação no Google Workspace e Microsoft 365.
            </p>
          </div>
          {config && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 self-start">
              Estado: {config.registrar_status}
            </span>
          )}
        </div>

        <form onSubmit={handleSaveConfig} aria-labelledby="dns-form-heading" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dns-web-target" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              Destino Web (IPv4 ou CNAME do servidor)
            </label>
            <input
              id="dns-web-target"
              name="target_web_ip_or_cname"
              type="text"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={webTarget}
              onChange={(e) => setWebTarget(e.target.value)}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono"
            />
          </div>
          <div>
            <label htmlFor="dns-cf-account" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              Cloudflare Account ID (opcional em Sandbox)
            </label>
            <input
              id="dns-cf-account"
              name="cloudflare_account_id"
              type="text"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={cfAccountId}
              onChange={(e) => setCfAccountId(e.target.value)}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono"
            />
          </div>
          <div>
            <label htmlFor="dns-google-verify" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              Token TXT Google Verification
            </label>
            <input
              id="dns-google-verify"
              name="google_verification_token"
              type="text"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="google-site-verification=..."
              value={googleToken}
              onChange={(e) => setGoogleToken(e.target.value)}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-mono"
            />
          </div>
          <div>
            <label htmlFor="dns-ms-verify" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              Token TXT Microsoft Verification
            </label>
            <input
              id="dns-ms-verify"
              name="microsoft_verification_token"
              type="text"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="MS=ms12345678"
              value={msToken}
              onChange={(e) => setMsToken(e.target.value)}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-mono"
            />
          </div>
          <div>
            <label htmlFor="dns-dkim-selector" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              Seletor DKIM
            </label>
            <input
              id="dns-dkim-selector"
              name="dkim_selector"
              type="text"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={dkimSelector}
              onChange={(e) => setDkimSelector(e.target.value)}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono"
            />
          </div>
          <div>
            <label htmlFor="dns-dkim-key" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              Chave Pública DKIM (opcional)
            </label>
            <input
              id="dns-dkim-key"
              name="dkim_public_key"
              type="text"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={dkimKey}
              onChange={(e) => setDkimKey(e.target.value)}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-mono"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-3 justify-between pt-2">
            <div className="flex flex-wrap gap-2">
              {config && (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => runAction(`/domains/configs/${config.id}/generate-blueprint/`, 'POST', 'Blueprint DNS gerado com sucesso!')}
                    className="px-4 py-2.5 rounded-xl border border-teal-300 bg-teal-50 text-teal-800 text-xs font-semibold hover:bg-teal-100"
                  >
                    1. Gerar Blueprint DNS
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => runAction(`/domains/configs/${config.id}/sync-cloudflare/`, 'POST', 'Zona e registos sincronizados na Cloudflare!')}
                    className="px-4 py-2.5 rounded-xl border border-sky-300 bg-sky-50 text-sky-800 text-xs font-semibold hover:bg-sky-100"
                  >
                    2. Sincronizar Cloudflare
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => runAction(`/domains/configs/${config.id}/verify-propagation/`, 'POST', 'Verificação DoH concluída!')}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-100"
                  >
                    3. Verificar Propagação (DoH)
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => runAction(`/domains/configs/${config.id}/dns-ao-dossier/`, 'GET', 'Checklist DNS.AO carregada!')}
                    className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100"
                  >
                    Ver Dossiê DNS.AO
                  </button>
                </>
              )}
            </div>
            <button
              type="submit"
              disabled={!schoolId || loading}
              className="px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50"
            >
              {config ? 'Atualizar Configuração' : 'Inicializar Zona DNS'}
            </button>
          </div>
        </form>

        {/* Nameservers & DNS.AO Dossier Box */}
        {(config?.nameservers?.length || dossier) && (
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2 text-xs">
            <span className="font-bold text-stone-900 uppercase block">
              Nameservers para Delegação no Registrar DNS.AO:
            </span>
            <div className="flex flex-wrap gap-2">
              {(dossier?.nameservers_to_configure || config?.nameservers || []).map((ns: string) => (
                <code key={ns} className="px-2.5 py-1 rounded bg-white border border-stone-300 font-mono text-teal-800">
                  {ns}
                </code>
              ))}
            </div>
            {dossier?.required_documents && (
              <ul className="list-disc list-inside text-stone-600 pt-1">
                {dossier.required_documents.map((doc: string, idx: number) => (
                  <li key={idx}>{doc}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* DNS Records Table */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <h3 id="dns-records-caption" className="text-base font-bold text-stone-900">
          Registos DNS da Zona ({config?.records?.length || 0})
        </h3>
        <div tabIndex={0} role="region" aria-labelledby="dns-records-caption" className="table-wrapper">
          <table className="edulink-table text-xs sm:text-sm">
            <caption className="sr-only">Registos DNS configurados para o domínio .edu.ao</caption>
            <thead>
              <tr className="text-xs uppercase text-stone-600 border-b border-stone-200">
                <th className="p-3 font-semibold">Tipo / Host</th>
                <th className="p-3 font-semibold">Finalidade</th>
                <th className="p-3 font-semibold">Conteúdo</th>
                <th className="p-3 font-semibold">Cloudflare</th>
                <th className="p-3 font-semibold">Propagado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {!config || config.records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-stone-500">
                    Nenhum registo DNS gerado. Clique em &quot;Inicializar Zona DNS&quot; e depois em &quot;1. Gerar Blueprint DNS&quot;.
                  </td>
                </tr>
              ) : (
                config.records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-stone-50/70">
                    <th scope="row" className="p-3 font-mono text-xs text-stone-900">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 mr-1.5 font-bold">
                        {rec.record_type}
                      </span>
                      {rec.name}
                    </th>
                    <td data-label="Finalidade" className="p-3 text-xs text-stone-700">
                      {rec.purpose}
                    </td>
                    <td data-label="Conteúdo" className="p-3 font-mono text-xs text-stone-700 break-all max-w-md">
                      {rec.priority !== null ? `[${rec.priority}] ` : ''}
                      {rec.content}
                    </td>
                    <td data-label="Cloudflare" className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          rec.sync_state === 'SYNCED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rec.sync_state}
                      </span>
                    </td>
                    <td data-label="Propagado" className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          rec.propagated ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {rec.propagated ? 'Sim (DoH)' : 'Aguardando'}
                      </span>
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
