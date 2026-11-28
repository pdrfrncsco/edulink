'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  FormField,
  Input,
  Select,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui';
import type { OnboardingDocumentItem, School, SetupStage } from '../types';

const STAGE_OPTIONS: { value: SetupStage; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Por Iniciar' },
  { value: 'PENDING_DOCS', label: 'Aguardando Docs' },
  { value: 'SUBMITTED', label: 'Submetido / Em Revisão' },
  { value: 'APPROVED', label: 'Aprovado / Ativo' },
  { value: 'ACTION_REQUIRED', label: 'Ação Necessária' },
  { value: 'NOT_ELIGIBLE', label: 'Não Elegível (Pago)' },
];

interface OpsSchoolInspectorProps {
  selectedSchool: School;
  documents: OnboardingDocumentItem[];
  busyId: string | null;
  onReviewDocument: (
    doc: OnboardingDocumentItem,
    decision: 'APPROVED' | 'REJECTED',
    notes: string
  ) => Promise<void>;
  onSavePipeline: (payload: {
    domain: string | null;
    dns_status: SetupStage;
    google_status: SetupStage;
    microsoft_status: SetupStage;
    canva_status: SetupStage;
    enable_erp_sync: boolean;
    enable_benefits_club: boolean;
    enable_online_payments: boolean;
  }) => Promise<void>;
}

/** Backoffice document review queue, turnkey domain/accreditation pipeline, and school feature flags. */
export default function OpsSchoolInspector({
  selectedSchool,
  documents,
  busyId,
  onReviewDocument,
  onSavePipeline,
}: OpsSchoolInspectorProps) {
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
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

  const docColumns: DataTableColumn<OnboardingDocumentItem>[] = [
    {
      key: 'doc',
      header: 'Documento',
      isRowHeader: true,
      render: (doc) => (
        <div>
          <span className="font-semibold text-stone-900 block">{doc.doc_type_label}</span>
          {doc.file && (
            <a
              href={doc.file}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 underline"
            >
              <span>Abrir Ficheiro</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (doc) => (
        <StatusBadge
          tone={
            doc.status === 'APPROVED' ? 'success' : doc.status === 'REJECTED' ? 'error' : 'warning'
          }
          dot
        >
          {doc.status_label}
        </StatusBadge>
      ),
    },
    {
      key: 'notes',
      header: 'Notas de Revisão',
      render: (doc) => (
        <div>
          <label htmlFor={`doc-note-${doc.id}`} className="sr-only">
            Notas para {doc.doc_type_label}
          </label>
          <Input
            id={`doc-note-${doc.id}`}
            type="text"
            value={reviewNotes[doc.id] ?? doc.review_notes ?? ''}
            onChange={(e) => setReviewNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))}
            placeholder="Observação opcional..."
            className="text-xs py-1.5 min-h-[38px]"
          />
        </div>
      ),
    },
    {
      key: 'decision',
      header: 'Decisão',
      render: (doc) => (
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            loading={busyId === doc.id}
            onClick={() =>
              onReviewDocument(doc, 'APPROVED', reviewNotes[doc.id] ?? doc.review_notes ?? '')
            }
          >
            Aprovar
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={busyId === doc.id}
            onClick={() =>
              onReviewDocument(doc, 'REJECTED', reviewNotes[doc.id] ?? doc.review_notes ?? '')
            }
          >
            Rejeitar
          </Button>
        </div>
      ),
    },
  ];

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
    <Card padding="md" className="space-y-5">
      <div>
        <h2 className="text-base font-bold text-stone-900">
          3. Revisão Documental, Pipeline &amp; Feature Flags — {selectedSchool.name}
        </h2>
        <p className="text-xs text-stone-600">
          Valide os comprovativos submetidos no onboarding, atualize os estados do pipeline
          chave-na-mão e ative módulos das Fases 2 e 3 para esta instituição.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-stone-700">
          Documentos de Onboarding ({documents.length})
        </h3>
        <DataTable
          columns={docColumns}
          data={documents}
          getRowKey={(doc) => doc.id}
          caption="Documentos legais enviados pela escola para revisão"
          emptyTitle="Nenhum documento carregado por esta instituição"
        />
      </div>

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

          <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 pt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={flagErp}
              onChange={(e) => setFlagErp(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            Ativar ERP &amp; Verificadores (Fase 2)
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 pt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={flagBenefits}
              onChange={(e) => setFlagBenefits(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            Ativar Clube de Benefícios
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 pt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={flagPayments}
              onChange={(e) => setFlagPayments(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            Ativar Pagamentos Portal
          </label>
        </div>

        <Button type="submit" loading={busyId === selectedSchool.id}>
          Guardar Pipeline &amp; Flags
        </Button>
      </form>
    </Card>
  );
}
