'use client';

import React from 'react';
import { Card } from '@/components/ui';
import type { OnboardingDocumentItem, School } from '../types';
import OpsDocumentReviewTable from './OpsDocumentReviewTable';
import OpsPipelineFlagsForm, { type OpsPipelinePayload } from './OpsPipelineFlagsForm';

interface OpsSchoolInspectorProps {
  selectedSchool: School;
  documents: OnboardingDocumentItem[];
  busyId: string | null;
  loadingDocs?: boolean;
  onReviewDocument: (
    doc: OnboardingDocumentItem,
    decision: 'APPROVED' | 'REJECTED',
    notes: string
  ) => Promise<void>;
  onSavePipeline: (payload: OpsPipelinePayload) => Promise<void>;
}

/** Backoffice document review queue, turnkey domain/accreditation pipeline, and school feature flags. */
export default function OpsSchoolInspector({
  selectedSchool,
  documents,
  busyId,
  loadingDocs = false,
  onReviewDocument,
  onSavePipeline,
}: OpsSchoolInspectorProps) {
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

      <OpsDocumentReviewTable
        documents={documents}
        busyId={busyId}
        loadingDocs={loadingDocs}
        onReviewDocument={onReviewDocument}
      />

      <OpsPipelineFlagsForm
        selectedSchool={selectedSchool}
        busy={busyId === selectedSchool.id}
        onSavePipeline={onSavePipeline}
      />
    </Card>
  );
}
