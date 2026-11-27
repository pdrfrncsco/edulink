'use client';

import React, { useMemo, useState } from 'react';
import { authFetch } from '@/lib/auth';
import { buildSchoolSiteHref, getDisplayRootDomain, isClientLocalHost } from '@/lib/siteUrls';
import { apiJson, FeedbackState } from './types';

interface OnboardingTabProps {
  onSchoolCreated: (schoolId: string) => void;
  onFeedback: (fb: FeedbackState | null) => void;
}

type InstitutionType = 'MED_K12' | 'MESCTI_HIGHER_ED';
type DocKey = 'ALVARA_MED_MESCTI' | 'NIF_CARD' | 'DIRECTOR_BI' | 'TECHNICAL_MANDATE';

interface OnboardingFormState {
  name: string;
  institution_type: InstitutionType;
  nif: string;
  alvara_med_mescti: string;
  preview_slug: string;
  domain: string;
  director_external_email: string;
  contact_email: string;
  phone: string;
  province: string;
  municipality: string;
  address: string;
  primary_color: string;
  logo_url: string;
  about_text: string;
}

const ROOT_DOMAIN = getDisplayRootDomain();

const ANGOLA_PROVINCES: Record<string, string[]> = {
  Luanda: ['Talatona', 'Belas', 'Kilamba Kiaxi', 'Luanda', 'Cazenga', 'Viana', 'Cacuaco', 'Icolo e Bengo', 'Quiçama'],
  Benguela: ['Benguela', 'Lobito', 'Catumbela', 'Baía Farta', 'Ganda', 'Cubal'],
  Huíla: ['Lubango', 'Matala', 'Chibia', 'Humpata', 'Caconda'],
  Huambo: ['Huambo', 'Caála', 'Bailundo', 'Londuimbali'],
  Bié: ['Cuito', 'Andulo', 'Camacupa', 'Catabola'],
  Cabinda: ['Cabinda', 'Cacongo', 'Buco-Zau', 'Belize'],
  'Cuanza Sul': ['Sumbe', 'Porto Amboim', 'Gabela', 'Waku Kungo'],
  'Cuanza Norte': ['Ndalatando', 'Cambambe', 'Cazengo'],
  Uíge: ['Uíge', 'Negage', 'Maquela do Zombo'],
  Malanje: ['Malanje', 'Cacuso', 'Calandula'],
  Namibe: ['Moçâmedes', 'Tômbwa', 'Bibala'],
  Huíla_Outras: [],
  Bengo: ['Caxito', 'Dande', 'Ambriz'],
  Cunene: ['Ondjiva', 'Cuanhama', 'Ombadja'],
  'Lunda Norte': ['Dundo', 'Chitato', 'Lucapa'],
  'Lunda Sul': ['Saurimo', 'Cacolo', 'Dala'],
  Moxico: ['Luena', 'Moxico', 'Camanongue'],
  Cuando: ['Mavinga', 'Menongue'],
  Zaire: ['Mbanza Kongo', 'Soyo', 'Nzeto'],
};

const PROVINCE_LIST = Object.keys(ANGOLA_PROVINCES).filter((p) => p !== 'Huíla_Outras');

const BRAND_COLORS = [
  { label: 'Verde EduLink', hex: '#0D9488' },
  { label: 'Azul Académico', hex: '#1D4ED8' },
  { label: 'Azul Marinho', hex: '#1E3A5F' },
  { label: 'Bordô Clássico', hex: '#991B1B' },
  { label: 'Dourado Escolar', hex: '#B45309' },
  { label: 'Verde Floresta', hex: '#15803D' },
];

const REQUIRED_DOCS: { key: DocKey; label: string; helper: string; requiredForApproval: boolean }[] = [
  {
    key: 'ALVARA_MED_MESCTI',
    label: 'Alvará / Despacho MED ou MESCTI',
    helper: 'PDF ou foto legível do reconhecimento oficial do Estado.',
    requiredForApproval: true,
  },
  {
    key: 'NIF_CARD',
    label: 'Cartão de Contribuinte (NIF)',
    helper: 'Obrigatório para registo DNS.AO e faturação eletrónica AGT.',
    requiredForApproval: true,
  },
  {
    key: 'DIRECTOR_BI',
    label: 'BI do Diretor / Representante Legal',
    helper: 'Identificação do signatário responsável perante DNS.AO e APD.',
    requiredForApproval: true,
  },
  {
    key: 'TECHNICAL_MANDATE',
    label: 'Mandato Técnico Assinado (Opcional na demo)',
    helper: 'Autoriza a EduLink a gerir DNS, Google Workspace e Microsoft 365.',
    requiredForApproval: false,
  },
];

const STEPS = [
  { id: 1, title: 'Identificação Legal', short: 'Legal' },
  { id: 2, title: 'Contactos & Documentos', short: 'Documentos' },
  { id: 3, title: 'Domínio & Marca', short: 'Domínio' },
  { id: 4, title: 'Pré-visualização & Envio', short: 'Revisão' },
];

function slugifyHost(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function cleanDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split(':')[0]
    .replace(/\.$/, '');
}

export default function OnboardingTab({ onSchoolCreated, onFeedback }: OnboardingTabProps) {
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

      const previewRoute = buildSchoolSiteHref(previewHost);
      const siteLabel = isClientLocalHost() ? previewRoute : `https://${previewHost}`;
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
    <form
      onSubmit={handleSubmit}
      aria-labelledby="onboarding-wizard-heading"
      className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-8 space-y-6 shadow-sm"
    >
      {/* Cabeçalho e Barra de Progresso */}
      <div className="border-b border-stone-100 pb-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="onboarding-wizard-heading" className="text-lg font-bold text-stone-900">
              Onboarding Institucional &amp; Gerador de Site
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Recolha os dados legais, publique imediatamente em <span className="font-mono text-teal-800">{effectiveSlug}.{ROOT_DOMAIN}</span> e prepare o dossiê DNS.AO, Google, Microsoft e APD.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-semibold text-teal-800">
            Passo {step} de {STEPS.length}
          </span>
        </div>

        <nav aria-label="Etapas do cadastro institucional">
          <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STEPS.map((item) => {
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
                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition ${
                      isCurrent
                        ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-bold'
                        : isDone
                        ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900 font-semibold hover:bg-emerald-50'
                        : 'border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="block text-[10px] uppercase tracking-wider opacity-80">
                      {isDone ? '✓ Concluído' : `Etapa ${item.id}`}
                    </span>
                    <span className="truncate block">{item.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {stepError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">
          {stepError}
        </div>
      )}

      {/* PASSO 1: IDENTIFICAÇÃO LEGAL */}
      {step === 1 && (
        <fieldset className="space-y-5">
          <legend className="text-sm font-bold text-stone-900">1. Identificação Oficial e Tutela (MED / MESCTI)</legend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="school-name" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                Nome Oficial da Instituição <span aria-hidden="true">*</span>
              </label>
              <input
                id="school-name"
                type="text"
                required
                autoComplete="organization"
                placeholder="Ex.: Colégio Esperança de Luanda"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <span className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                Nível de Ensino / Entidade Acreditadora <span aria-hidden="true">*</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                    formData.institution_type === 'MED_K12'
                      ? 'border-teal-600 bg-teal-50/60'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="institution_type"
                    checked={formData.institution_type === 'MED_K12'}
                    onChange={() => updateField('institution_type', 'MED_K12')}
                    className="mt-1 accent-teal-700"
                  />
                  <div>
                    <span className="block text-xs font-bold text-stone-900">Ensino Primário, Secundário ou Técnico (MED)</span>
                    <span className="block text-[11px] text-stone-600">
                      Elegível para Google Workspace, Microsoft 365 A1 e <strong>Canva Educação 100% gratuito</strong>.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                    formData.institution_type === 'MESCTI_HIGHER_ED'
                      ? 'border-teal-600 bg-teal-50/60'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="institution_type"
                    checked={formData.institution_type === 'MESCTI_HIGHER_ED'}
                    onChange={() => updateField('institution_type', 'MESCTI_HIGHER_ED')}
                    className="mt-1 accent-teal-700"
                  />
                  <div>
                    <span className="block text-xs font-bold text-stone-900">Ensino Superior / IES (MESCTI)</span>
                    <span className="block text-[11px] text-stone-600">
                      Elegível para Google, Microsoft 365 A1, GitHub &amp; SheerID (Canva Campus requer licença própria).
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="school-nif" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                NIF Institucional (Angola) <span aria-hidden="true">*</span>
              </label>
              <input
                id="school-nif"
                type="text"
                required
                inputMode="numeric"
                placeholder="Ex.: 5412345678"
                value={formData.nif}
                onChange={(e) => updateField('nif', e.target.value)}
                className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono"
              />
            </div>

            <div>
              <label htmlFor="school-alvara" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                N.º do Alvará / Despacho MED ou MESCTI <span aria-hidden="true">*</span>
              </label>
              <input
                id="school-alvara"
                type="text"
                required
                placeholder="Ex.: Alvará MED n.º 432/2024 ou Decreto Presidencial"
                value={formData.alvara_med_mescti}
                onChange={(e) => updateField('alvara_med_mescti', e.target.value)}
                className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="school-province" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                Província
              </label>
              <select
                id="school-province"
                value={formData.province}
                onChange={(e) => updateField('province', e.target.value)}
                className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm bg-white"
              >
                {PROVINCE_LIST.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="school-municipality" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                Município
              </label>
              {municipalities.length > 0 ? (
                <select
                  id="school-municipality"
                  value={formData.municipality}
                  onChange={(e) => updateField('municipality', e.target.value)}
                  className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm bg-white"
                >
                  {municipalities.map((mun) => (
                    <option key={mun} value={mun}>
                      {mun}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="school-municipality"
                  type="text"
                  placeholder="Ex.: Sede Municipal"
                  value={formData.municipality}
                  onChange={(e) => updateField('municipality', e.target.value)}
                  className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
                />
              )}
            </div>
          </div>
        </fieldset>
      )}

      {/* PASSO 2: CONTACTOS & DOCUMENTOS LEGAIS */}
      {step === 2 && (
        <fieldset className="space-y-5">
          <legend className="text-sm font-bold text-stone-900">2. Contactos Oficiais &amp; Dossiê de Acreditação</legend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="director-email" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                E-mail Externo do Diretor / Responsável <span aria-hidden="true">*</span>
              </label>
              <input
                id="director-email"
                type="email"
                required
                placeholder="Ex.: diretor.escola@gmail.com"
                value={formData.director_external_email}
                onChange={(e) => updateField('director_external_email', e.target.value)}
                className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
              />
              <p className="mt-1 text-[11px] text-stone-500">
                Use uma caixa de correio já ativa (fora do novo domínio) para receber as notificações da Google e DNS.AO.
              </p>
            </div>

            <div>
              <label htmlFor="school-phone" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                Telefone / WhatsApp da Secretaria
              </label>
              <input
                id="school-phone"
                type="tel"
                autoComplete="tel"
                placeholder="Ex.: +244 923 000 000"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="school-address" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                Endereço Físico Completo
              </label>
              <input
                id="school-address"
                type="text"
                autoComplete="street-address"
                placeholder="Ex.: Via AL14, Bairro Camama, Talatona — Luanda"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-stone-800">
                  Documentos Oficiais (PDF, PNG ou JPG)
                </h3>
                <p className="text-[11px] text-stone-600">
                  Pode anexar já ou completar depois — para demonstrações comerciais, o upload é opcional.
                </p>
              </div>
              <span className="rounded-full bg-white border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-700">
                {uploadedDocsCount} / {REQUIRED_DOCS.length} anexado(s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {REQUIRED_DOCS.map((doc) => {
                const file = documents[doc.key];
                return (
                  <div key={doc.key} className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-stone-900">{doc.label}</p>
                        <p className="text-[11px] text-stone-500">{doc.helper}</p>
                      </div>
                      {file && (
                        <button
                          type="button"
                          onClick={() => handleFileChange(doc.key, null)}
                          className="text-[11px] font-semibold text-red-700 hover:underline shrink-0"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileChange(doc.key, e.target.files?.[0] || null)}
                      className="block w-full text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100"
                    />
                    {file && (
                      <p className="text-[11px] font-mono text-emerald-700 truncate">
                        ✓ {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </fieldset>
      )}

      {/* PASSO 3: DOMÍNIO & IDENTIDADE VISUAL */}
      {step === 3 && (
        <fieldset className="space-y-5">
          <legend className="text-sm font-bold text-stone-900">3. Domínio Institucional &amp; Identidade do Site</legend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="preview-slug" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                Endereço Instantâneo (Demonstração) <span aria-hidden="true">*</span>
              </label>
              <div className="flex items-center rounded-xl border border-stone-300 overflow-hidden bg-white">
                <input
                  id="preview-slug"
                  type="text"
                  value={formData.preview_slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    updateField('preview_slug', slugifyHost(e.target.value));
                  }}
                  placeholder="colegio-esperanca"
                  className="w-full px-3.5 py-2.5 text-sm font-mono text-stone-900 focus:outline-none"
                />
                <span className="px-3 py-2.5 bg-stone-100 border-l border-stone-200 text-xs font-mono text-stone-600 shrink-0">
                  .{ROOT_DOMAIN}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                Fica online de imediato para apresentação ao diretor e encarregados de educação.
              </p>
            </div>

            <div>
              <label htmlFor="school-domain" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                Domínio Definitivo (.edu.ao ou Próprio)
              </label>
              <input
                id="school-domain"
                type="text"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Ex.: colegio-esperanca.edu.ao (opcional agora)"
                value={formData.domain}
                onChange={(e) => updateField('domain', e.target.value)}
                className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono text-teal-800"
              />
              <p className="mt-1 text-[11px] text-stone-500">
                Obrigatório apenas na etapa de submissão ao Google Workspace e Microsoft 365.
              </p>
            </div>

            <div>
              <label htmlFor="school-email" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                E-mail Público da Secretaria (no Site)
              </label>
              <input
                id="school-email"
                type="email"
                placeholder={suggestedContactEmail}
                value={formData.contact_email}
                onChange={(e) => updateField('contact_email', e.target.value)}
                className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="school-logo" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                URL do Logótipo (Opcional)
              </label>
              <input
                id="school-logo"
                type="url"
                placeholder="https://.../logo-escola.png"
                value={formData.logo_url}
                onChange={(e) => updateField('logo_url', e.target.value)}
                className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <span className="block text-xs font-semibold uppercase text-stone-700 mb-2">
                Cor Primária da Escola (Site e Cartão Digital)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {BRAND_COLORS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => updateField('primary_color', preset.hex)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                      formData.primary_color.toUpperCase() === preset.hex
                        ? 'border-stone-900 bg-stone-100 text-stone-900'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-black/15" style={{ backgroundColor: preset.hex }} />
                    {preset.label}
                  </button>
                ))}
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-mono text-stone-700 cursor-pointer">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => updateField('primary_color', e.target.value.toUpperCase())}
                    className="w-5 h-5 border-0 bg-transparent cursor-pointer"
                  />
                  {formData.primary_color}
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="school-about" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
                Apresentação Institucional (Site Público)
              </label>
              <textarea
                id="school-about"
                rows={3}
                placeholder="Descreva brevemente os níveis de ensino, missão educativa e diferenciais da instituição..."
                value={formData.about_text}
                onChange={(e) => updateField('about_text', e.target.value)}
                className="edulink-input w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm"
              />
            </div>
          </div>
        </fieldset>
      )}

      {/* PASSO 4: REVISÃO & PRÉ-VISUALIZAÇÃO AO VIVO */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">4. Pré-visualização ao Vivo do Site Institucional</h3>
              <p className="text-xs text-stone-500">
                Confirme os dados abaixo antes de criar o tenant e publicar o portal escolar.
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-stone-200 p-1 bg-stone-50 text-xs">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`px-3 py-1 rounded-lg font-semibold ${
                  previewDevice === 'desktop' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
                }`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`px-3 py-1 rounded-lg font-semibold ${
                  previewDevice === 'mobile' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
                }`}
              >
                Telemóvel
              </button>
            </div>
          </div>

          {/* Browser Mockup do Site Gerado */}
          <div
            className={`mx-auto rounded-2xl border border-stone-300 overflow-hidden shadow-md bg-white transition-all ${
              previewDevice === 'mobile' ? 'max-w-[360px]' : 'w-full'
            }`}
          >
            <div className="bg-stone-100 border-b border-stone-200 px-3 py-2 flex items-center gap-2 text-[11px] font-mono text-stone-600">
              <span className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
              </span>
              <span className="flex-1 bg-white rounded-md px-2.5 py-0.5 border border-stone-200 truncate">
                {isClientLocalHost() ? `/sites/${previewHost}` : `https://${previewHost}`}
              </span>
            </div>

            <div className="p-6 text-white space-y-4" style={{ backgroundColor: formData.primary_color }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {formData.logo_url ? (
                    <img
                      src={formData.logo_url}
                      alt="Logótipo da instituição"
                      className="w-10 h-10 rounded-xl bg-white object-contain p-1 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm shrink-0">
                      {(formData.name || 'E').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider opacity-85 block">
                      {formData.institution_type === 'MED_K12' ? 'Ensino Acreditado MED' : 'Ensino Superior MESCTI'}
                    </span>
                    <h4 className="text-base font-extrabold truncate">{formData.name}</h4>
                  </div>
                </div>
                <span className="hidden sm:inline-block rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold shrink-0">
                  Portal / Webmail
                </span>
              </div>

              <p className="text-xs sm:text-sm text-white/90 max-w-2xl">
                {formData.about_text ||
                  'Instituição de ensino oficialmente acreditada, preparada para o ecossistema Google Workspace, Microsoft 365 e Passaporte Académico Digital.'}
              </p>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-stone-50 border-t border-stone-100">
              <div className="bg-white p-3 rounded-xl border border-stone-200">
                <span className="text-[10px] font-bold uppercase text-stone-500 block">Acreditação Oficial</span>
                <span className="font-semibold text-stone-900">{formData.alvara_med_mescti}</span>
                <span className="block text-[11px] font-mono text-stone-500">NIF {formData.nif}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-stone-200">
                <span className="text-[10px] font-bold uppercase text-stone-500 block">Localização</span>
                <span className="font-semibold text-stone-900">
                  {formData.municipality ? `${formData.municipality}, ` : ''}
                  {formData.province}
                </span>
                <span className="block text-[11px] text-stone-500 truncate">{formData.address || 'Angola'}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-stone-200">
                <span className="text-[10px] font-bold uppercase text-stone-500 block">Secretaria</span>
                <span className="font-semibold text-stone-900 block truncate">
                  {formData.contact_email || suggestedContactEmail}
                </span>
                <span className="block text-[11px] text-stone-500">{formData.phone || 'Contacto institucional'}</span>
              </div>
            </div>
          </div>

          {/* Checklist de Prontidão para Auditoria */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
              <span className="font-bold text-stone-800 block">DNS &amp; Domínio</span>
              <span className="text-stone-600">
                {cleanedDomain
                  ? `Domínio definitivo definido (${cleanedDomain})`
                  : `Modo demonstração (${effectiveSlug}.${ROOT_DOMAIN})`}
              </span>
            </div>
            <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
              <span className="font-bold text-stone-800 block">Dossiê Documental</span>
              <span className="text-stone-600">
                {uploadedDocsCount > 0
                  ? `${uploadedDocsCount} documento(s) pronto(s) para envio`
                  : 'Nenhum ficheiro anexado ainda (pode enviar depois)'}
              </span>
            </div>
            <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
              <span className="font-bold text-stone-800 block">Elegibilidade Cloud</span>
              <span className="text-stone-600">
                {formData.institution_type === 'MED_K12'
                  ? 'Google + Microsoft A1 + Canva Educação (Grátis)'
                  : 'Google + Microsoft A1 + GitHub/SheerID (IES)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé de Navegação */}
      <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 1 || loading}
          className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-700 font-semibold text-xs sm:text-sm hover:bg-stone-50 disabled:opacity-40"
        >
          Anterior
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={goNext}
            className="px-6 py-2.5 rounded-xl bg-teal-700 text-white font-semibold text-xs sm:text-sm hover:bg-teal-800 transition shadow-sm"
          >
            Continuar
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-teal-700 text-white font-semibold text-xs sm:text-sm hover:bg-teal-800 disabled:opacity-50 transition shadow-sm"
          >
            {loading ? 'A Criar Escola e Publicar Site...' : 'Confirmar e Publicar Escola'}
          </button>
        )}
      </div>
    </form>
  );
}