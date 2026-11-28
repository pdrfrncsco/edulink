'use client';

import React, { useEffect, useState } from 'react';
import { Button, CheckboxField, FormField, Input, Select } from '@/components/ui';
import type { School, SetupStage } from '../types';

const STAGE_OPTIONS: { value: SetupStage; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Por Iniciar' },
  { value: 'PENDING_DOCS', label: 'Aguardando Docs' },
  { value: 'SUBMITTED', label: 'Submetido / Em Revisão' },
  { value: 'APPROVED', label: 'Aprovado / Ativo' },
  { value: 'ACTION_REQUIRED', label: 'Ação Necessária' },
  { value: 'NOT_ELIGIBLE', label: 'Não Elegível (Pago)' },
];

export interface OpsPipelinePayload {
  domain: string | null;
  dns_status: SetupStage;
  google_status: SetupStage;
  microsoft_status: SetupStage;
  canva_status: SetupStage;
  enable_erp_sync: boolean;
  enable_benefits_club: boolean;
  enable_online_payments: boolean;
}

interface OpsPipelineFlagsFormProps {
  selectedSchool: School;
  busy: boolean;
  onSavePipeline: (payload: OpsPipelinePayload) => Promise<void>;
}

/** Backoffice form for official `.edu.ao` domain assignment, turnkey stages, and tenant flags. */
export default function OpsPipelineFlagsForm({
  selectedSchool,
  busy,
  onSavePipeline,
}: OpsPipelineFlagsFormProps) {
  const [officialDomain, setOfficialDomain] = useState(selectedSchool.domain || '');
  const [dnsStatus, setDnsStatus] = useState<SetupStage>(selectedSchool.dns_status || 'NOT_STARTED');
  const [googleStatus, setGoogleStatus] = useState<SetupStage>(
    selectedSchool.google_status || 'NOT_STARTED'
  );
  const [microsoftStatus, setMicrosoftStatus] = useState<SetupStage>(
    selectedSchool.microsoft_status || 'NOT_STARTED'
  );
  const [canvaStatus, setCanvaStatus] = useState<SetupStage>(
    selectedSchool.canva_status || 'NOT_STARTED'
  );
  const [flagErp, setFlagErp] = useState(Boolean(selectedSchool.enable_erp_sync));
  const [flagBenefits, setFlagBenefits] = useState(Boolean(selectedSchool.enable_benefits_club));
  const [flagPayments, setFlagPayments] = useState(Boolean(selectedSchool.enable_online_payments));

  useEffect(() => {
    setOfficialDomain(selectedSchool.domain || '');
    setDnsStatus(selectedSchool.dns_status || 'NOT_STARTED');
    setGoogleStatus(selectedSchool.google_status || 'NOT_STARTED');
    setMicrosoftStatus(selectedSchool.microsoft_status || 'NOT_STARTED');
    setCanvaStatus(selectedSchool.canva_status || 'NOT_STARTED');
    setFlagErp(Boolean(selectedSchool.enable_erp_sync));
    setFlagBenefits(Boolean(selectedSchool.enable_benefits_club));
    setFlagPayments(Boolean(selectedSchool.enable_online_payments));
  }, [selectedSchool]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSavePipeline({
      domain: officialDomain.trim() || null,
      dns_status: dnsStatus,
      google_status: googleStatus,
      microsoft_status: microsoftStatus,
      canva_status: canvaStatus,
      enable_erp_sync: flagErp,
      enable_benefits_club: flagBenefits,
      enable_online_payments: flagPayments,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4"
    >
      <h3 className="text-xs font-bold uppercase tracking-wide text-stone-700">
        Domínio Oficial, Pipeline &amp; Feature Flags
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <FormField
          id="ops-school-domain"
          label="Domínio Oficial (.edu.ao)"
          className="md:col-span-2"
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              mono
              invalid={invalid}
              aria-describedby={describedBy}
              value={officialDomain}
              onChange={(e) => setOfficialDomain(e.target.value)}
              placeholder="colegio-esperanca.edu.ao"
            />
          )}
        </FormField>

        <FormField id="ops-dns-stage" label="DNS .edu.ao">
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              invalid={invalid}
              aria-describedby={describedBy}
              value={dnsStatus}
              onChange={(e) => setDnsStatus(e.target.value as SetupStage)}
            >
              {STAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField id="ops-google-stage" label="Google Workspace">
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              invalid={invalid}
              aria-describedby={describedBy}
              value={googleStatus}
              onChange={(e) => setGoogleStatus(e.target.value as SetupStage)}
            >
              {STAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField id="ops-ms-stage" label="Microsoft 365">
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              invalid={invalid}
              aria-describedby={describedBy}
              value={microsoftStatus}
              onChange={(e) => setMicrosoftStatus(e.target.value as SetupStage)}
            >
              {STAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
        <FormField id="ops-canva-stage" label="Canva Educação">
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              invalid={invalid}
              aria-describedby={describedBy}
              value={canvaStatus}
              onChange={(e) => setCanvaStatus(e.target.value as SetupStage)}
            >
              {STAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <div className="pt-4">
          <CheckboxField
            id="ops-flag-erp"
            checked={flagErp}
            onChange={setFlagErp}
            label={<span className="text-xs font-semibold text-stone-800">Ativar ERP &amp; Verificadores (Fase 2)</span>}
          />
        </div>
        <div className="pt-4">
          <CheckboxField
            id="ops-flag-benefits"
            checked={flagBenefits}
            onChange={setFlagBenefits}
            label={<span className="text-xs font-semibold text-stone-800">Ativar Clube de Benefícios</span>}
          />
        </div>
        <div className="pt-4">
          <CheckboxField
            id="ops-flag-payments"
            checked={flagPayments}
            onChange={setFlagPayments}
            label={<span className="text-xs font-semibold text-stone-800">Ativar Pagamentos Portal</span>}
          />
        </div>
      </div>

      <Button type="submit" loading={busy}>
        Guardar Pipeline &amp; Flags
      </Button>
    </form>
  );
}
