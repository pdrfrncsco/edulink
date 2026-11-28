'use client';

import React from 'react';
import { Button, Card, CopyButton } from '@/components/ui';
import { apiJson, type FeedbackState } from '../types';

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
export default function KeycloakSsoCard({
  schoolId,
  ssoMetadata,
  loading,
  onSetLoading,
  onFeedback,
}: KeycloakSsoCardProps) {
  const handleSyncKeycloak = async () => {
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
  };

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
        <Button type="button" variant="outline" disabled={!schoolId || loading} onClick={handleSyncKeycloak}>
          Sincronizar Utilizadores no Keycloak
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <Card variant="muted" padding="sm" className="rounded-xl space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-stone-700 uppercase">SAML 2.0 IdP Metadata (Canva)</span>
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
