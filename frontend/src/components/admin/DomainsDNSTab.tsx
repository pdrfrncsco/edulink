'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertBanner,
  Button,
  Card,
  CopyButton,
  FormField,
  Input,
  StatusBadge,
} from '@/components/ui';
import DnsRecordsTable from './DnsRecordsTable';
import { apiJson, DomainConfig, FeedbackState } from './types';

interface DomainsDNSTabProps {
  schoolId: string;
  hasOfficialDomain?: boolean;
  onFeedback: (fb: FeedbackState | null) => void;
}

/** `.edu.ao` DNS.AO registrar dossier, Cloudflare automation blueprint, and DoH checker. */
export default function DomainsDNSTab({
  schoolId,
  hasOfficialDomain = true,
  onFeedback,
}: DomainsDNSTabProps) {
  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [dossier, setDossier] = useState<{
    nameservers_to_configure?: string[];
    required_documents?: string[];
  } | null>(null);
  const [googleToken, setGoogleToken] = useState('');
  const [msToken, setMsToken] = useState('');
  const [dkimSelector, setDkimSelector] = useState('google');
  const [dkimKey, setDkimKey] = useState('');
  const [webTarget, setWebTarget] = useState('sites.edulink.ao');
  const [cfAccountId, setCfAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(Boolean(schoolId));

  const resetFormFields = () => {
    setDossier(null); setGoogleToken(''); setMsToken('');
    setDkimSelector('google'); setDkimKey(''); setWebTarget('sites.edulink.ao'); setCfAccountId('');
  };

  const loadConfig = async () => {
    if (!schoolId) {
      setConfig(null); resetFormFields(); setFetching(false);
      return;
    }
    setFetching(true);
    try {
      const data = await apiJson<{ results: DomainConfig[] }>(`/domains/configs/?school=${schoolId}`);
      const first = (data.results || [])[0] || null;
      setConfig(first);
      if (first) {
        setDossier(null);
        setGoogleToken(first.google_verification_token || '');
        setMsToken(first.microsoft_verification_token || '');
        setDkimSelector(first.dkim_selector || 'google');
        setDkimKey(first.dkim_public_key || '');
        setWebTarget(first.target_web_ip_or_cname || 'sites.edulink.ao');
        setCfAccountId(first.cloudflare_account_id || '');
      } else {
        resetFormFields();
      }
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setFetching(false);
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

  const runAction = async (path: string, method: 'POST' | 'GET', successMessage: string) => {
    setLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson<{
        nameservers?: string[];
        nameservers_to_configure?: string[];
        required_documents?: string[];
        domain?: string;
        zone_id?: string;
      }>(path, { method });
      if (path.endsWith('dns-ao-dossier/')) {
        setDossier(res);
      }
      onFeedback({
        type: 'success',
        message: successMessage,
        details: res.nameservers
          ? {
              next_steps: res.nameservers.map((ns) => `NS: ${ns}`),
              domain: res.domain,
              school_id: res.zone_id,
            }
          : undefined,
      });
      await loadConfig();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const nameservers = dossier?.nameservers_to_configure || config?.nameservers || [];

  return (
    <div className="space-y-6">
      {!hasOfficialDomain && (
        <AlertBanner tone="warning">
          <strong>Modo Demonstração ativo:</strong> esta escola ainda utiliza o endereço provisório{' '}
          <code>.edulink.ao</code> e não tem domínio definitivo (<code>.edu.ao</code>) atribuído.
          Defina o domínio oficial na consola de Operação EduLink antes de gerar ou sincronizar
          registos DNS na Cloudflare.
        </AlertBanner>
      )}

      <Card padding="lg" className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h2 id="dns-form-heading" className="text-lg font-bold text-stone-900">
              Domínio Oficial (.edu.ao) e DNS
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Gera automaticamente registos Web, MX, SPF combinado, DKIM e DMARC para aprovação no
              Google Workspace e Microsoft 365.
            </p>
          </div>
          {config && (
            <StatusBadge tone="brand" size="md" className="self-start">
              Estado: {config.registrar_status}
            </StatusBadge>
          )}
        </div>

        <form
          onSubmit={handleSaveConfig}
          aria-labelledby="dns-form-heading"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <FormField id="dns-web-target" label="Destino Web (IPv4 ou CNAME do servidor)">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="target_web_ip_or_cname"
                mono
                invalid={invalid}
                aria-describedby={describedBy}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={webTarget}
                onChange={(e) => setWebTarget(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="dns-cf-account" label="Cloudflare Account ID (opcional em Sandbox)">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="cloudflare_account_id"
                mono
                invalid={invalid}
                aria-describedby={describedBy}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={cfAccountId}
                onChange={(e) => setCfAccountId(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="dns-google-verify" label="Token TXT Google Verification">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="google_verification_token"
                mono
                invalid={invalid}
                aria-describedby={describedBy}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="google-site-verification=..."
                value={googleToken}
                onChange={(e) => setGoogleToken(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="dns-ms-verify" label="Token TXT Microsoft Verification">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="microsoft_verification_token"
                mono
                invalid={invalid}
                aria-describedby={describedBy}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="MS=ms12345678"
                value={msToken}
                onChange={(e) => setMsToken(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="dns-dkim-selector" label="Seletor DKIM">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="dkim_selector"
                mono
                invalid={invalid}
                aria-describedby={describedBy}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={dkimSelector}
                onChange={(e) => setDkimSelector(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="dns-dkim-key" label="Chave Pública DKIM (opcional)">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="dkim_public_key"
                mono
                invalid={invalid}
                aria-describedby={describedBy}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={dkimKey}
                onChange={(e) => setDkimKey(e.target.value)}
              />
            )}
          </FormField>

          <div className="md:col-span-2 flex flex-wrap gap-3 justify-between pt-2">
            <div className="flex flex-wrap gap-2">
              {config && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => runAction(`/domains/configs/${config.id}/generate-blueprint/`, 'POST', 'Blueprint DNS gerado com sucesso!')}
                  >
                    1. Gerar Blueprint DNS
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => runAction(`/domains/configs/${config.id}/sync-cloudflare/`, 'POST', 'Zona e registos sincronizados na Cloudflare!')}
                  >
                    2. Sincronizar Cloudflare
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => runAction(`/domains/configs/${config.id}/verify-propagation/`, 'POST', 'Verificação de propagação DNS concluída!')}
                  >
                    3. Verificar Propagação DNS
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => runAction(`/domains/configs/${config.id}/dns-ao-dossier/`, 'GET', 'Checklist DNS.AO carregada!')}
                  >
                    Ver Dossiê DNS.AO
                  </Button>
                </>
              )}
            </div>
            <Button type="submit" disabled={!schoolId} loading={loading}>
              {config ? 'Atualizar Configuração' : 'Inicializar Zona DNS'}
            </Button>
          </div>
        </form>

        {(nameservers.length > 0 || dossier) && (
          <Card variant="muted" padding="sm" className="rounded-xl space-y-2 text-xs">
            <span className="font-bold text-stone-900 uppercase block">
              Nameservers para Delegação no Registrar DNS.AO:
            </span>
            <div className="flex flex-wrap gap-2">
              {nameservers.map((ns) => (
                <div
                  key={ns}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-300"
                >
                  <code className="font-mono text-teal-800">{ns}</code>
                  <CopyButton value={ns} label="Copiar" size="sm" />
                </div>
              ))}
            </div>
            {dossier?.required_documents && (
              <ul className="list-disc list-inside text-stone-600 pt-1">
                {dossier.required_documents.map((doc, idx) => (
                  <li key={idx}>{doc}</li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </Card>

      <DnsRecordsTable records={config?.records || []} loading={fetching} />
    </div>
  );
}
