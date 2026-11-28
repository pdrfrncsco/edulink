'use client';

import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { AlertBanner, Button, Card, StatusBadge, cn } from '@/components/ui';
import { authFetch } from '@/lib/auth';
import { buildSchoolSiteHref } from '@/lib/siteUrls';
import { useIsLocalHost } from '@/lib/useIsLocalHost';
import StepDocs from './onboarding/StepDocs';
import StepDomain from './onboarding/StepDomain';
import StepLegal from './onboarding/StepLegal';
import StepPreview from './onboarding/StepPreview';
import {
  ANGOLA_PROVINCES,
  ONBOARDING_STEPS,
  ROOT_DOMAIN,
  cleanDomain,
  slugifyHost,
  type DocKey,
  type OnboardingFormState,
} from './onboarding/types';
import { apiJson, FeedbackState } from './types';

interface OnboardingTabProps {
  onSchoolCreated: (schoolId: string) => void;
  onFeedback: (fb: FeedbackState | null) => void;
}

/** 4-step institutional onboarding wizard and live site generator. */
export default function OnboardingTab({ onSchoolCreated, onFeedback }: OnboardingTabProps) {
  const isLocalHostBrowser = useIsLocalHost();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stepError, setStepError] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [documents, setDocuments] = useState<Partial<Record<DocKey, File>>>({});

  const [formData, setFormData] = useState<OnboardingFormState>({
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
  });

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

  const validateStep = (targetStep: number): string | null => {
    if (targetStep === 1) {
      if (!formData.name.trim()) return 'Indique o nome oficial completo da instituição.';
      if (!/^\d{9,10}[A-Za-z0-9]?$/.test(formData.nif.trim())) {
        return 'O NIF institucional deve conter entre 9 e 10 dígitos numéricos (ex.: 5412345678).';
      }
      if (!formData.alvara_med_mescti.trim()) {
        return 'Indique o número do Alvará ou Despacho MED/MESCTI.';
      }
    }

    if (targetStep === 2) {
      if (!formData.director_external_email.trim() || !formData.director_external_email.includes('@')) {
        return 'Indique um e-mail externo válido do diretor/responsável (necessário para aprovação DNS.AO e Google).';
      }
    }

    if (targetStep === 3) {
      if (!effectiveSlug || effectiveSlug === 'sua-escola') {
        return 'Defina um slug válido para o endereço de demonstração na EduLink.';
      }
      if (
        cleanedDomain &&
        !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:edu\.ao|ed\.ao|co\.ao|ao|com|org|net|localhost)$/.test(
          cleanedDomain
        )
      ) {
        return 'Domínio definitivo inválido. Use um formato como colegio.edu.ao, colegio.co.ao ou deixe em branco para usar apenas o endereço de demonstração.';
      }
    }

    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
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

  const uploadOnboardingDocuments = async (schoolId: string): Promise<{ uploaded: number; failed: string[] }> => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const s of [1, 2, 3]) {
      const err = validateStep(s);
      if (err) {
        setStep(s);
        setStepError(err);
        return;
      }
    }

    setLoading(true);
    setStepError('');
    onFeedback(null);

    const payload = {
      name: formData.name.trim(),
      institution_type: formData.institution_type,
      nif: formData.nif.trim(),
      alvara_med_mescti: formData.alvara_med_mescti.trim(),
      preview_slug: effectiveSlug,
      domain: cleanedDomain || null,
      director_external_email: formData.director_external_email.trim(),
      contact_email: (formData.contact_email.trim() || suggestedContactEmail).toLowerCase(),
      phone: formData.phone.trim(),
      province: formData.province,
      municipality: formData.municipality.trim(),
      address: formData.address.trim(),
      primary_color: formData.primary_color,
      logo_url: formData.logo_url.trim() || null,
      about_text:
        formData.about_text.trim() ||
        `${formData.name.trim()} — instituição acreditada comprometida com a excelência académica e literacia digital.`,
    };

    try {
      const data = await apiJson<{ school_id?: string; id?: string }>('/tenants/onboard/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const createdSchoolId = data.school_id || data.id;
      let docSummary = '';

      if (createdSchoolId && Object.keys(documents).length > 0) {
        const { uploaded, failed } = await uploadOnboardingDocuments(createdSchoolId);
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

  const uploadedDocsCount = Object.keys(documents).length;

  return (
    <Card padding="lg" className="space-y-6">
      <form onSubmit={handleSubmit} aria-labelledby="onboarding-wizard-heading" className="space-y-6">
        <div className="border-b border-stone-100 pb-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="onboarding-wizard-heading" className="text-lg font-bold text-stone-900">
                Onboarding Institucional &amp; Gerador de Site
              </h2>
              <p className="text-xs sm:text-sm text-stone-500">
                Recolha os dados legais, publique imediatamente em{' '}
                <span className="font-mono text-teal-800">
                  {effectiveSlug}.{ROOT_DOMAIN}
                </span>{' '}
                e prepare o dossiê DNS.AO, Google, Microsoft e APD.
              </p>
            </div>
            <StatusBadge tone="brand" size="md">
              Passo {step} de {ONBOARDING_STEPS.length}
            </StatusBadge>
          </div>

          <nav aria-label="Etapas do cadastro institucional">
            <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ONBOARDING_STEPS.map((item) => {
                const isCurrent = step === item.id;
                const isDone = step > item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.id < step) {
                          setStepError('');
                          setStep(item.id);
                        }
                      }}
                      disabled={item.id > step}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-xl border text-xs transition',
                        isCurrent
                          ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-bold'
                          : isDone
                          ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900 font-semibold hover:bg-emerald-50'
                          : 'border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed'
                      )}
                    >
                      <span className="block text-[10px] uppercase tracking-wider opacity-80">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1">
                            <Check className="h-3 w-3" aria-hidden="true" />
                            Concluído
                          </span>
                        ) : (
                          `Etapa ${item.id}`
                        )}
                      </span>
                      <span className="truncate block">{item.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {stepError && <AlertBanner tone="error">{stepError}</AlertBanner>}

        {step === 1 && (
          <StepLegal
            formData={formData}
            municipalities={municipalities}
            onUpdateField={updateField}
          />
        )}

        {step === 2 && (
          <StepDocs
            formData={formData}
            documents={documents}
            uploadedDocsCount={uploadedDocsCount}
            onUpdateField={updateField}
            onFileChange={handleFileChange}
          />
        )}

        {step === 3 && (
          <StepDomain
            formData={formData}
            suggestedContactEmail={suggestedContactEmail}
            onUpdateField={updateField}
            onSlugTouched={() => setSlugTouched(true)}
          />
        )}

        {step === 4 && (
          <StepPreview
            formData={formData}
            previewDevice={previewDevice}
            previewHost={previewHost}
            effectiveSlug={effectiveSlug}
            cleanedDomain={cleanedDomain}
            suggestedContactEmail={suggestedContactEmail}
            uploadedDocsCount={uploadedDocsCount}
            isLocalHostBrowser={isLocalHostBrowser}
            onChangeDevice={setPreviewDevice}
          />
        )}

        <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={step === 1 || loading}
          >
            Anterior
          </Button>

          {step < 4 ? (
            <Button type="button" variant="primary" onClick={goNext}>
              Continuar
            </Button>
          ) : (
            <Button type="submit" variant="primary" loading={loading}>
              {loading ? 'A Criar Escola e Publicar Site...' : 'Confirmar e Publicar Escola'}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
