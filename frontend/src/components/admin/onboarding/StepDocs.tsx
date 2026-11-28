'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { Card, FormField, Input, StatusBadge } from '@/components/ui';
import { REQUIRED_DOCS, type DocKey, type OnboardingFormState } from './types';

interface StepDocsProps {
  formData: OnboardingFormState;
  documents: Partial<Record<DocKey, File>>;
  uploadedDocsCount: number;
  onUpdateField: <K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]) => void;
  onFileChange: (key: DocKey, file: File | null) => void;
}

/** Step 2: Official administrative contacts and accreditation document uploads. */
export default function StepDocs({
  formData,
  documents,
  uploadedDocsCount,
  onUpdateField,
  onFileChange,
}: StepDocsProps) {
  return (
    <fieldset className="space-y-5">
      <legend className="text-sm font-bold text-stone-900">
        2. Contactos Oficiais &amp; Dossiê de Acreditação
      </legend>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          id="director-email"
          label="E-mail Externo do Diretor / Responsável"
          required
          hint="Use uma caixa de correio já ativa (fora do novo domínio) para receber as notificações da Google e DNS.AO."
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="email"
              required
              invalid={invalid}
              aria-describedby={describedBy}
              placeholder="Ex.: diretor.escola@gmail.com"
              value={formData.director_external_email}
              onChange={(e) => onUpdateField('director_external_email', e.target.value)}
            />
          )}
        </FormField>

        <FormField id="school-phone" label="Telefone / WhatsApp da Secretaria">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="tel"
              invalid={invalid}
              aria-describedby={describedBy}
              autoComplete="tel"
              placeholder="Ex.: +244 923 000 000"
              value={formData.phone}
              onChange={(e) => onUpdateField('phone', e.target.value)}
            />
          )}
        </FormField>

        <FormField id="school-address" label="Endereço Físico Completo" className="md:col-span-2">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="text"
              invalid={invalid}
              aria-describedby={describedBy}
              autoComplete="street-address"
              placeholder="Ex.: Via AL14, Bairro Camama, Talatona — Luanda"
              value={formData.address}
              onChange={(e) => onUpdateField('address', e.target.value)}
            />
          )}
        </FormField>
      </div>

      <Card variant="muted" padding="sm" className="rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-800">
              Documentos Oficiais (PDF, PNG ou JPG)
            </h3>
            <p className="text-[11px] text-stone-600">
              Pode anexar já ou completar depois — para demonstrações comerciais, o upload é opcional.
            </p>
          </div>
          <StatusBadge tone="neutral" className="bg-white">
            {uploadedDocsCount} / {REQUIRED_DOCS.length} anexado(s)
          </StatusBadge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REQUIRED_DOCS.map((doc) => {
            const file = documents[doc.key];
            const inputId = `doc-upload-${doc.key}`;
            return (
              <Card key={doc.key} padding="none" className="rounded-xl p-3 space-y-2 shadow-none">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <label htmlFor={inputId} className="block text-xs font-bold text-stone-900">
                      {doc.label}
                    </label>
                    <p className="text-[11px] text-stone-500">{doc.helper}</p>
                  </div>
                  {file && (
                    <button
                      type="button"
                      onClick={() => onFileChange(doc.key, null)}
                      className="text-[11px] font-semibold text-red-700 hover:underline shrink-0"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <input
                  id={inputId}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => onFileChange(doc.key, e.target.files?.[0] || null)}
                  className="block w-full text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-800 hover:file:bg-teal-100"
                />
                {file && (
                  <p className="text-[11px] font-mono text-emerald-700 flex items-center gap-1 min-w-0">
                    <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
                    </span>
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </Card>
    </fieldset>
  );
}
