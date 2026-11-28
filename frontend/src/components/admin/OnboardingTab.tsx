'use client';

import React from 'react';
import { AlertBanner, Button, Card } from '@/components/ui';
import OnboardingStepper from './onboarding/OnboardingStepper';
import StepDocs from './onboarding/StepDocs';
import StepDomain from './onboarding/StepDomain';
import StepLegal from './onboarding/StepLegal';
import StepPreview from './onboarding/StepPreview';
import { useOnboardingWizard } from './onboarding/useOnboardingWizard';
import type { FeedbackState } from './types';

interface OnboardingTabProps {
  onSchoolCreated: (schoolId: string) => void;
  onFeedback: (fb: FeedbackState | null) => void;
}

/** 4-step institutional onboarding wizard and live site generator. */
export default function OnboardingTab({ onSchoolCreated, onFeedback }: OnboardingTabProps) {
  const wizard = useOnboardingWizard({ onSchoolCreated, onFeedback });

  return (
    <Card padding="lg" className="space-y-6">
      <form
        onSubmit={wizard.handleSubmit}
        aria-labelledby="onboarding-wizard-heading"
        className="space-y-6"
      >
        <OnboardingStepper
          step={wizard.step}
          effectiveSlug={wizard.effectiveSlug}
          onSelectStep={wizard.selectStep}
        />

        {wizard.stepError && <AlertBanner tone="error">{wizard.stepError}</AlertBanner>}

        {wizard.step === 1 && (
          <StepLegal
            formData={wizard.formData}
            municipalities={wizard.municipalities}
            onUpdateField={wizard.updateField}
          />
        )}

        {wizard.step === 2 && (
          <StepDocs
            formData={wizard.formData}
            documents={wizard.documents}
            uploadedDocsCount={wizard.uploadedDocsCount}
            onUpdateField={wizard.updateField}
            onFileChange={wizard.handleFileChange}
          />
        )}

        {wizard.step === 3 && (
          <StepDomain
            formData={wizard.formData}
            suggestedContactEmail={wizard.suggestedContactEmail}
            onUpdateField={wizard.updateField}
            onSlugTouched={wizard.setSlugTouched}
          />
        )}

        {wizard.step === 4 && (
          <StepPreview
            formData={wizard.formData}
            previewDevice={wizard.previewDevice}
            previewHost={wizard.previewHost}
            effectiveSlug={wizard.effectiveSlug}
            cleanedDomain={wizard.cleanedDomain}
            suggestedContactEmail={wizard.suggestedContactEmail}
            uploadedDocsCount={wizard.uploadedDocsCount}
            isLocalHostBrowser={wizard.isLocalHostBrowser}
            onChangeDevice={wizard.setPreviewDevice}
          />
        )}

        <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={wizard.goBack}
            disabled={wizard.step === 1 || wizard.loading}
          >
            Anterior
          </Button>

          {wizard.step < 4 ? (
            <Button type="button" variant="primary" onClick={wizard.goNext}>
              Continuar
            </Button>
          ) : (
            <Button type="submit" variant="primary" loading={wizard.loading}>
              {wizard.loading ? 'A Criar Escola e Publicar Site...' : 'Confirmar e Publicar Escola'}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
