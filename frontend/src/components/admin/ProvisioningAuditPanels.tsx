'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import {
  AlertBanner,
  Button,
  Card,
  CopyButton,
  DataTable,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui';
import { formatDateTimeAO } from '@/lib/formatters';
import { apiJson, type CloudIntegration, type FeedbackState, type ProvisioningLog } from './types';

interface ActiveIntegrationsGridProps {
  integrations: CloudIntegration[];
  loading: boolean;
  onTestConnection: (id: string) => void;
}

/** Configured Google Workspace and Microsoft 365 cloud integration status cards. */
export function ActiveIntegrationsGrid({
  integrations,
  loading,
  onTestConnection,
}: ActiveIntegrationsGridProps) {
  if (integrations.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {integrations.map((intg) => (
        <Card key={intg.id} variant="muted" padding="sm" className="rounded-xl space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm text-stone-900">
              {intg.provider === 'GOOGLE'
                ? 'Google Workspace for Education'
                : 'Microsoft 365 (Entra ID)'}
            </span>
            <StatusBadge
              tone={
                intg.sync_status === 'SUCCESS'
                  ? 'success'
                  : intg.sync_status === 'ERROR'
                  ? 'error'
                  : 'warning'
              }
              dot
            >
              {intg.sync_status}
            </StatusBadge>
          </div>
          {intg.last_error_message && (
            <AlertBanner tone="error">{intg.last_error_message}</AlertBanner>
          )}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-stone-500">
              {intg.last_sync_at
                ? `Última sync: ${formatDateTimeAO(intg.last_sync_at)}`
                : 'Nunca sincronizado'}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => onTestConnection(intg.id)}
            >
              Testar Ligação
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

interface KeycloakSsoCardProps {
  schoolId: string;
  ssoMetadata: {
    realm: string;
    saml_idp_metadata_url: string;
    oidc_discovery_url: string;
  };
  loading: boolean;
  onSetLoading: (loading: boolean) => void;
  onFeedback: (fb: FeedbackState | null) => void;
}

/** Keycloak SAML 2.0 / OIDC metadata card for Canva Education and single sign-on sync. */
export function KeycloakSsoCard({
  schoolId,
  ssoMetadata,
  loading,
  onSetLoading,
  onFeedback,
}: KeycloakSsoCardProps) {
  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-stone-900">
            Acesso Único Institucional (Canva e Portais)
          </h3>
          <p className="text-xs text-stone-500">
            Identidade única institucional para portais EduLink e ativação no Canva para Educação.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!schoolId || loading}
          onClick={async () => {
            onSetLoading(true);
            onFeedback(null);
            try {
              const res = await apiJson<{ synced_count: number; realm: string }>(
                `/auth/sync-keycloak/${schoolId}/`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                }
              );
              onFeedback({
                type: 'success',
                message: `Keycloak SSO sincronizado: ${res.synced_count} utilizador(es) no realm ${res.realm}.`,
              });
            } catch (err: any) {
              onFeedback({ type: 'error', message: err.message });
            } finally {
              onSetLoading(false);
            }
          }}
        >
          Sincronizar Utilizadores no Keycloak
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <Card variant="muted" padding="sm" className="rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-stone-700 uppercase">
              SAML 2.0 IdP Metadata (Canva)
            </span>
            <CopyButton value={ssoMetadata.saml_idp_metadata_url} label="Copiar" size="sm" />
          </div>
          <code className="block font-mono text-teal-800 break-all">
            {ssoMetadata.saml_idp_metadata_url}
          </code>
        </Card>
        <Card variant="muted" padding="sm" className="rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-stone-700 uppercase">
              OIDC Discovery (Realm {ssoMetadata.realm})
            </span>
            <CopyButton value={ssoMetadata.oidc_discovery_url} label="Copiar" size="sm" />
          </div>
          <code className="block font-mono text-teal-800 break-all">
            {ssoMetadata.oidc_discovery_url}
          </code>
        </Card>
      </div>
    </Card>
  );
}

interface ProvisioningLogsTableProps {
  logs: ProvisioningLog[];
  loading?: boolean;
  onRefresh: () => void;
}

/** Auditable Google/Microsoft provisioning and revocation history table. */
export function ProvisioningLogsTable({
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
