'use client';

import React from 'react';
import { Button, CheckboxField, FormField, Input, Textarea } from '@/components/ui';

interface CloudConnectorFormProps {
  schoolId: string;
  provider: 'GOOGLE' | 'MICROSOFT';
  sandboxMode: boolean;
  delegatedAdmin: string;
  googleJson: string;
  msTenantId: string;
  msClientId: string;
  msClientSecret: string;
  loading: boolean;
  onChangeProvider: (p: 'GOOGLE' | 'MICROSOFT') => void;
  onChangeSandboxMode: (v: boolean) => void;
  onChangeDelegatedAdmin: (v: string) => void;
  onChangeGoogleJson: (v: string) => void;
  onChangeMsTenantId: (v: string) => void;
  onChangeMsClientId: (v: string) => void;
  onChangeMsClientSecret: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Form for configuring Google Workspace Service Account or Microsoft 365 Entra ID credentials. */
export default function CloudConnectorForm({
  schoolId,
  provider,
  sandboxMode,
  delegatedAdmin,
  googleJson,
  msTenantId,
  msClientId,
  msClientSecret,
  loading,
  onChangeProvider,
  onChangeSandboxMode,
  onChangeDelegatedAdmin,
  onChangeGoogleJson,
  onChangeMsTenantId,
  onChangeMsClientId,
  onChangeMsClientSecret,
  onSubmit,
}: CloudConnectorFormProps) {
  return (
    <form onSubmit={onSubmit} aria-labelledby="cloud-form-heading" className="space-y-4 pt-2">
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase text-stone-700">
          Selecione o Provedor de Nuvem
        </legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="cloud_provider"
              value="GOOGLE"
              checked={provider === 'GOOGLE'}
              onChange={() => onChangeProvider('GOOGLE')}
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
              onChange={() => onChangeProvider('MICROSOFT')}
              className="accent-teal-700"
            />
            <span>Microsoft 365 Education (Entra ID)</span>
          </label>
        </div>
      </fieldset>

      <CheckboxField
        id="sandbox-mode-check"
        name="sandbox_mode"
        checked={sandboxMode}
        onChange={onChangeSandboxMode}
        label="Executar em modo Sandbox (simulação segura sem credenciais reais de produção)"
      />

      {provider === 'GOOGLE' ? (
        <div className="space-y-4">
          <FormField
            id="google-delegated-admin"
            label="E-mail Super Admin Google (Domain-Wide Delegation)"
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="delegated_admin_email"
                type="email"
                mono
                invalid={invalid}
                aria-describedby={describedBy}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="admin@colegio-esperanca.edu.ao"
                value={delegatedAdmin}
                onChange={(e) => onChangeDelegatedAdmin(e.target.value)}
              />
            )}
          </FormField>
          {!sandboxMode && (
            <FormField id="google-sa-json" label="JSON da Service Account (Google Cloud)" required>
              {({ id, describedBy, invalid }) => (
                <Textarea
                  id={id}
                  name="google_sa_json"
                  rows={4}
                  required
                  invalid={invalid}
                  aria-describedby={describedBy}
                  placeholder='{"type": "service_account", "client_email": "...", "private_key": "..."}'
                  value={googleJson}
                  onChange={(e) => onChangeGoogleJson(e.target.value)}
                  className="text-xs font-mono"
                />
              )}
            </FormField>
          )}
        </div>
      ) : (
        !sandboxMode && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField id="ms-tenant" label="Tenant ID (Entra ID)" required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="ms_tenant_id"
                  required
                  mono
                  invalid={invalid}
                  aria-describedby={describedBy}
                  value={msTenantId}
                  onChange={(e) => onChangeMsTenantId(e.target.value)}
                />
              )}
            </FormField>
            <FormField id="ms-client" label="Client ID (App Registration)" required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="ms_client_id"
                  required
                  mono
                  invalid={invalid}
                  aria-describedby={describedBy}
                  value={msClientId}
                  onChange={(e) => onChangeMsClientId(e.target.value)}
                />
              )}
            </FormField>
            <FormField id="ms-secret" label="Client Secret" required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="ms_client_secret"
                  type="password"
                  required
                  mono
                  invalid={invalid}
                  aria-describedby={describedBy}
                  value={msClientSecret}
                  onChange={(e) => onChangeMsClientSecret(e.target.value)}
                />
              )}
            </FormField>
          </div>
        )
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={!schoolId} loading={loading}>
          Guardar Integração Encriptada
        </Button>
      </div>
    </form>
  );
}
