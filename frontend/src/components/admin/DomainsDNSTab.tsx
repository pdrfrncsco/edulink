'use client';

import React, { useEffect, useState } from 'react';
import { AlertBanner, Card, StatusBadge } from '@/components/ui';
import DnsRecordsTable from './DnsRecordsTable';
import DnsAoDossierCard from './domains/DnsAoDossierCard';
import DomainConfigForm from './domains/DomainConfigForm';
import { apiJson, type DomainConfig, type FeedbackState } from './types';

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
    setDossier(null);
    setGoogleToken('');
    setMsToken('');
    setDkimSelector('google');
    setDkimKey('');
    setWebTarget('sites.edulink.ao');
    setCfAccountId('');
  };

  const loadConfig = async () => {
    if (!schoolId) {
      setConfig(null);
      resetFormFields();
      setFetching(false);
      return;
    }
    setFetching(true);
    try {
      const data = await apiJson<{ results: DomainConfig[] }>(
        `/domains/configs/?school=${schoolId}`
      );
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

        <DomainConfigForm
          schoolId={schoolId}
          config={config}
          webTarget={webTarget}
          cfAccountId={cfAccountId}
          googleToken={googleToken}
          msToken={msToken}
          dkimSelector={dkimSelector}
          dkimKey={dkimKey}
          loading={loading}
          onChangeWebTarget={setWebTarget}
          onChangeCfAccountId={setCfAccountId}
          onChangeGoogleToken={setGoogleToken}
          onChangeMsToken={setMsToken}
          onChangeDkimSelector={setDkimSelector}
          onChangeDkimKey={setDkimKey}
          onSubmit={handleSaveConfig}
          onRunAction={runAction}
        />

        {(nameservers.length > 0 || dossier) && (
          <DnsAoDossierCard
            nameservers={nameservers}
            requiredDocuments={dossier?.required_documents}
          />
        )}
      </Card>

      <DnsRecordsTable records={config?.records || []} loading={fetching} />
    </div>
  );
}
