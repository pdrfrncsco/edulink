'use client';

import React, { useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';
import ActiveIntegrationsGrid from './provisioning/ActiveIntegrationsGrid';
import CloudConnectorForm from './provisioning/CloudConnectorForm';
import KeycloakSsoCard from './provisioning/KeycloakSsoCard';
import ProvisioningLogsTable from './provisioning/ProvisioningLogsTable';
import { apiJson, type CloudIntegration, type FeedbackState, type ProvisioningLog } from './types';

interface ProvisioningTabProps {
  schoolId: string;
  onFeedback: (fb: FeedbackState | null) => void;
}

/** Google Admin SDK, Microsoft Graph, Keycloak SSO metadata, and provisioning audit logs. */
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
  const [ssoMetadata, setSsoMetadata] = useState<{
    realm: string;
    saml_idp_metadata_url: string;
    oidc_discovery_url: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(Boolean(schoolId));

  const loadData = async () => {
    if (!schoolId) {
      setIntegrations([]);
      setLogs([]);
      setSsoMetadata(null);
      setFetching(false);
      return;
    }
    setFetching(true);
    try {
      const [intData, logData, ssoData] = await Promise.all([
        apiJson<{ results: CloudIntegration[] }>(`/tenants/integrations/?school=${schoolId}`),
        apiJson<{ results: ProvisioningLog[] }>(`/provisioning/logs/?school=${schoolId}`),
        apiJson<{
          realm: string;
          saml_idp_metadata_url: string;
          oidc_discovery_url: string;
        }>(`/auth/sso-metadata/?school_id=${schoolId}`),
      ]);
      setIntegrations(intData.results || []);
      setLogs(logData.results || []);
      setSsoMetadata(ssoData);
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    setGoogleJson('');
    setDelegatedAdmin('');
    setMsTenantId('');
    setMsClientId('');
    setMsClientSecret('');
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
      let credentials_payload: Record<string, unknown> = {};
      if (provider === 'GOOGLE') {
        if (sandboxMode) {
          credentials_payload = {
            sandbox: true,
            delegated_admin_email: delegatedAdmin || undefined,
          };
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
          body: JSON.stringify({
            school: schoolId,
            provider,
            sync_enabled: true,
            credentials_payload,
          }),
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
      const res = await apiJson<{ details?: { status?: string } }>(
        `/provisioning/test-connection/${integrationId}/`,
        { method: 'POST' }
      );
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
      const res = await apiJson<{ message: string; task_id: string }>(
        `/provisioning/sync-school/${schoolId}/`,
        { method: 'POST' }
      );
      onFeedback({
        type: 'success',
        message: `${res.message} (Pedido #${res.task_id})`,
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
      <Card padding="lg" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h2 id="cloud-form-heading" className="text-lg font-bold text-stone-900">
              Conectores Cloud (Google Admin SDK &amp; Microsoft Graph)
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              As credenciais são encriptadas com Fernet (AES-256) antes de serem persistidas na
              base de dados.
            </p>
          </div>
          <Button
            type="button"
            disabled={!schoolId || integrations.length === 0}
            loading={loading}
            onClick={handleBatchSync}
          >
            Sincronizar Toda a Escola
          </Button>
        </div>

        <ActiveIntegrationsGrid
          integrations={integrations}
          loading={loading}
          onTestConnection={handleTestConnection}
        />

        <CloudConnectorForm
          schoolId={schoolId}
          provider={provider}
          sandboxMode={sandboxMode}
          delegatedAdmin={delegatedAdmin}
          googleJson={googleJson}
          msTenantId={msTenantId}
          msClientId={msClientId}
          msClientSecret={msClientSecret}
          loading={loading}
          onChangeProvider={setProvider}
          onChangeSandboxMode={setSandboxMode}
          onChangeDelegatedAdmin={setDelegatedAdmin}
          onChangeGoogleJson={setGoogleJson}
          onChangeMsTenantId={setMsTenantId}
          onChangeMsClientId={setMsClientId}
          onChangeMsClientSecret={setMsClientSecret}
          onSubmit={handleSaveIntegration}
        />
      </Card>

      {ssoMetadata && (
        <KeycloakSsoCard
          schoolId={schoolId}
          ssoMetadata={ssoMetadata}
          loading={loading}
          onSetLoading={setLoading}
          onFeedback={onFeedback}
        />
      )}

      <ProvisioningLogsTable logs={logs} loading={fetching} onRefresh={loadData} />
    </div>
  );
}
