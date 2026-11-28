'use client';

import React from 'react';
import { Button, FormField, Input, Select } from '@/components/ui';
import type { ERPConnection } from '../types';

interface ErpConnectorFormProps {
  schoolId: string;
  erpProvider: ERPConnection['provider'];
  apiBaseUrl: string;
  loading: boolean;
  onChangeProvider: (provider: ERPConnection['provider']) => void;
  onChangeApiBaseUrl: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** Form for activating a KLASSE, SysPortal, Kacennu, or generic JSON webhook connector. */
export default function ErpConnectorForm({
  schoolId,
  erpProvider,
  apiBaseUrl,
  loading,
  onChangeProvider,
  onChangeApiBaseUrl,
  onSubmit,
}: ErpConnectorFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby="erp-form-heading"
      className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
    >
      <FormField id="erp-provider" label="Software ERP Local">
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            name="provider"
            invalid={invalid}
            aria-describedby={describedBy}
            value={erpProvider}
            onChange={(e) => onChangeProvider(e.target.value as ERPConnection['provider'])}
          >
            <option value="KLASSE">KLASSE ERP</option>
            <option value="SYSPORTAL">SysPortal Académico</option>
            <option value="KACENNU">Kacennu Gestão Escolar</option>
            <option value="GENERIC">Webhook Genérico JSON</option>
          </Select>
        )}
      </FormField>

      <FormField id="erp-api-url" label="URL da API do ERP (opcional)">
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="api_base_url"
            type="url"
            mono
            invalid={invalid}
            aria-describedby={describedBy}
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://api.erp-escola.ao/v1"
            value={apiBaseUrl}
            onChange={(e) => onChangeApiBaseUrl(e.target.value)}
          />
        )}
      </FormField>

      <Button type="submit" size="lg" disabled={!schoolId} loading={loading}>
        Ativar Conector ERP
      </Button>
    </form>
  );
}
