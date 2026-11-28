'use client';

import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button, DataTable, Input, StatusBadge, type DataTableColumn } from '@/components/ui';
import type { OnboardingDocumentItem } from '../types';

interface OpsDocumentReviewTableProps {
  documents: OnboardingDocumentItem[];
  busyId: string | null;
  loadingDocs?: boolean;
  onReviewDocument: (
    doc: OnboardingDocumentItem,
    decision: 'APPROVED' | 'REJECTED',
    notes: string
  ) => Promise<void>;
}

/** Backoffice review queue for legal onboarding documents submitted by institutions. */
export default function OpsDocumentReviewTable({
  documents,
  busyId,
  loadingDocs = false,
  onReviewDocument,
}: OpsDocumentReviewTableProps) {
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

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

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-stone-700">
        Documentos de Onboarding ({documents.length})
      </h3>
      <DataTable
        columns={docColumns}
        data={documents}
        getRowKey={(doc) => doc.id}
        caption="Documentos legais enviados pela escola para revisão"
        loading={loadingDocs}
        emptyTitle="Nenhum documento carregado por esta instituição"
      />
    </div>
  );
}
