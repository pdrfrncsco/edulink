'use client';

import React from 'react';
import { Button, FormField, Input } from '@/components/ui';
import type { DomainConfig } from '../types';

interface DomainConfigFormProps {
  schoolId: string;
  config: DomainConfig | null;
  webTarget: string;
  cfAccountId: string;
  googleToken: string;
  msToken: string;
  dkimSelector: string;
  dkimKey: string;
  loading: boolean;
  onChangeWebTarget: (v: string) => void;
  onChangeCfAccountId: (v: string) => void;
  onChangeGoogleToken: (v: string) => void;
  onChangeMsToken: (v: string) => void;
  onChangeDkimSelector: (v: string) => void;
  onChangeDkimKey: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onRunAction: (path: string, method: 'POST' | 'GET', successMessage: string) => void;
}

/** DNS zone configuration form and Cloudflare / DNS.AO automation actions. */
export default function DomainConfigForm({
  schoolId,
  config,
  webTarget,
  cfAccountId,
  googleToken,
  msToken,
  dkimSelector,
  dkimKey,
  loading,
  onChangeWebTarget,
  onChangeCfAccountId,
  onChangeGoogleToken,
  onChangeMsToken,
  onChangeDkimSelector,
  onChangeDkimKey,
  onSubmit,
  onRunAction,
}: DomainConfigFormProps) {
  return (
    <form
      onSubmit={onSubmit}
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
            onChange={(e) => onChangeWebTarget(e.target.value)}
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
            onChange={(e) => onChangeCfAccountId(e.target.value)}
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
            onChange={(e) => onChangeGoogleToken(e.target.value)}
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
            onChange={(e) => onChangeMsToken(e.target.value)}
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
            onChange={(e) => onChangeDkimSelector(e.target.value)}
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
            onChange={(e) => onChangeDkimKey(e.target.value)}
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
                onClick={() =>
                  onRunAction(
                    `/domains/configs/${config.id}/generate-blueprint/`,
                    'POST',
                    'Blueprint DNS gerado com sucesso!'
                  )
                }
              >
                1. Gerar Blueprint DNS
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() =>
                  onRunAction(
                    `/domains/configs/${config.id}/sync-cloudflare/`,
                    'POST',
                    'Zona e registos sincronizados na Cloudflare!'
                  )
                }
              >
                2. Sincronizar Cloudflare
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() =>
                  onRunAction(
                    `/domains/configs/${config.id}/verify-propagation/`,
                    'POST',
                    'Verificação de propagação DNS concluída!'
                  )
                }
              >
                3. Verificar Propagação DNS
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() =>
                  onRunAction(
                    `/domains/configs/${config.id}/dns-ao-dossier/`,
                    'GET',
                    'Checklist DNS.AO carregada!'
                  )
                }
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
  );
}
