'use client';

import React, { useMemo, useState } from 'react';
import { authFetch } from '@/lib/auth';
import { buildSchoolSiteHref } from '@/lib/siteUrls';
import { useIsLocalHost } from '@/lib/useIsLocalHost';
import { apiJson, type FeedbackState } from '../types';
import {
  ANGOLA_PROVINCES,
  ROOT_DOMAIN,
  cleanDomain,
  slugifyHost,
  type DocKey,
  type OnboardingFormState,
} from './types';
import { buildOnboardingPayload, validateOnboardingStep } from './validation';

const INITIAL_FORM_STATE: OnboardingFormState = {
  name: '',
  institution_type: 'MED_K12',
  nif: '',
  alvara_med_mescti: '',
  preview_slug: '',
  domain: '',
  director_external_email: '',
  contact_email: '',
  phone: '',
  province: 'Luanda',
  municipality: 'Talatona',
  address: '',
  primary_color: '#0D9488',
  logo_url: '',
  about_text: '',
};

async function uploadOnboardingDocuments(
  schoolId: string,
  documents: Partial<Record<DocKey, File>>
): Promise<{ uploaded: number; failed: string[] }> {
  const entries = Object.entries(documents) as [DocKey, File][];
  if (entries.length === 0) return { uploaded: 0, failed: [] };

  let uploaded = 0;
  const failed: string[] = [];

  for (const [docType, file] of entries) {
    try {
      const fd = new FormData();
      fd.append('doc_type', docType);
      fd.append('file', file);
      const res = await authFetch(`/tenants/${schoolId}/documents/`, {
        method: 'POST',
        body: fd,
      });
      if (res.ok) {
        uploaded += 1;
      } else {
        failed.push(docType);
      }
    } catch {
      failed.push(docType);
    }
  }

  return { uploaded, failed };
}

/** Manages form state, validation, document uploads, and submission for institutional onboarding. */
export function useOnboardingWizard({
  onSchoolCreated,
  onFeedback,
}: {
  onSchoolCreated: (schoolId: string) => void;
  onFeedback: (fb: FeedbackState | null) => void;
}) {
  const isLocalHostBrowser = useIsLocalHost();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stepError, setStepError] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [documents, setDocuments] = useState<Partial<Record<DocKey, File>>>({});
  const [formData, setFormData] = useState<OnboardingFormState>(INITIAL_FORM_STATE);

  const municipalities = useMemo(
    () => ANGOLA_PROVINCES[formData.province] || [],
    [formData.province]
  );

  const effectiveSlug = formData.preview_slug || slugifyHost(formData.name) || 'sua-escola';
  const cleanedDomain = cleanDomain(formData.domain);
  const previewHost = cleanedDomain || `${effectiveSlug}.${ROOT_DOMAIN}`;
  const suggestedContactEmail = cleanedDomain
    ? `secretaria@${cleanedDomain}`
    : formData.director_external_email || `secretaria@${effectiveSlug}.${ROOT_DOMAIN}`;

  const updateField = <K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]) => {
    setStepError('');
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && !slugTouched) {
        next.preview_slug = slugifyHost(String(value));
      }
      if (key === 'province') {
        const list = ANGOLA_PROVINCES[String(value)] || [];
        next.municipality = list[0] || '';
      }
      return next;
    });
  };

  const handleFileChange = (key: DocKey, file: File | null) => {
    setDocuments((prev) => {
      const next = { ...prev };
      if (file) {
        next[key] = file;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const selectStep = (targetStep: number) => {
    if (targetStep < step) {
      setStepError('');
      setStep(targetStep);
    }
  };

  const goNext = () => {
    const err = validateOnboardingStep(step, formData, effectiveSlug, cleanedDomain);
    if (err) {
      setStepError(err);
      return;
    }
    setStepError('');
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const goBack = () => {
    setStepError('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const s of [1, 2, 3]) {
      const err = validateOnboardingStep(s, formData, effectiveSlug, cleanedDomain);
      if (err) {
        setStep(s);
        setStepError(err);
        return;
      }
    }

    setLoading(true);
    setStepError('');
    onFeedback(null);

    const payload = buildOnboardingPayload(
      formData,
      effectiveSlug,
      cleanedDomain,
      suggestedContactEmail
    );

    try {
      const data = await apiJson<{ school_id?: string; id?: string }>('/tenants/onboard/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const createdSchoolId = data.school_id || data.id;
      let docSummary = '';

      if (createdSchoolId && Object.keys(documents).length > 0) {
        const { uploaded, failed } = await uploadOnboardingDocuments(createdSchoolId, documents);
        if (uploaded > 0 && failed.length === 0) {
          docSummary = ` ${uploaded} documento(s) anexado(s) com sucesso.`;
        } else if (failed.length > 0) {
          docSummary = ` Escola criada, mas ${failed.length} documento(s) ficaram pendentes de envio no dossiê.`;
        }
      }

      const previewRoute = buildSchoolSiteHref(previewHost, isLocalHostBrowser);
      const siteLabel = isLocalHostBrowser ? previewRoute : `https://${previewHost}`;
      onFeedback({
        type: 'success',
        message: `Instituição "${payload.name}" registada com sucesso! Pré-visualização disponível em ${siteLabel}.${docSummary}`,
        details: data,
      });

      if (createdSchoolId) {
        onSchoolCreated(createdSchoolId);
      }
    } catch (err: any) {
      onFeedback({
        type: 'error',
        message: err.message || 'Erro ao submeter cadastro da instituição.',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    isLocalHostBrowser,
    step,
    loading,
    stepError,
    previewDevice,
    setPreviewDevice,
    documents,
    uploadedDocsCount: Object.keys(documents).length,
    formData,
    municipalities,
    effectiveSlug,
    cleanedDomain,
    previewHost,
    suggestedContactEmail,
    setSlugTouched: () => setSlugTouched(true),
    updateField,
    handleFileChange,
    selectStep,
    goNext,
    goBack,
    handleSubmit,
  };
}
