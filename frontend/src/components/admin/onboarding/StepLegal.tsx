'use client';

import React from 'react';
import { FormField, Input, Select, cn } from '@/components/ui';
import {
  PROVINCE_LIST,
  type OnboardingFormState,
} from './types';

interface StepLegalProps {
  formData: OnboardingFormState;
  municipalities: string[];
  onUpdateField: <K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]) => void;
}

/** Step 1: Legal identification, accreditation (MED/MESCTI), NIF, and Angola location. */
export default function StepLegal({ formData, municipalities, onUpdateField }: StepLegalProps) {
  return (
    <fieldset className="space-y-5">
      <legend className="text-sm font-bold text-stone-900">
        1. Identificação Oficial e Tutela (MED / MESCTI)
      </legend>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField id="school-name" label="Nome Oficial da Instituição" required className="md:col-span-2">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="text"
              required
              invalid={invalid}
              aria-describedby={describedBy}
              autoComplete="organization"
              placeholder="Ex.: Colégio Esperança de Luanda"
              value={formData.name}
              onChange={(e) => onUpdateField('name', e.target.value)}
            />
          )}
        </FormField>

        <div className="md:col-span-2 space-y-1.5">
          <span className="block text-xs font-semibold uppercase text-stone-700">
            Nível de Ensino / Entidade Acreditadora <span aria-hidden="true" className="text-red-600">*</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              htmlFor="institution-type-med"
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition',
                formData.institution_type === 'MED_K12'
                  ? 'border-teal-600 bg-teal-50/60'
                  : 'border-stone-200 hover:bg-stone-50'
              )}
            >
              <input
                id="institution-type-med"
                type="radio"
                name="institution_type"
                checked={formData.institution_type === 'MED_K12'}
                onChange={() => onUpdateField('institution_type', 'MED_K12')}
                className="mt-1 accent-teal-700"
              />
              <div>
                <span className="block text-xs font-bold text-stone-900">
                  Ensino Primário, Secundário ou Técnico (MED)
                </span>
                <span className="block text-[11px] text-stone-600">
                  Elegível para Google Workspace, Microsoft 365 A1 e <strong>Canva Educação 100% gratuito</strong>.
                </span>
              </div>
            </label>

            <label
              htmlFor="institution-type-mescti"
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition',
                formData.institution_type === 'MESCTI_HIGHER_ED'
                  ? 'border-teal-600 bg-teal-50/60'
                  : 'border-stone-200 hover:bg-stone-50'
              )}
            >
              <input
                id="institution-type-mescti"
                type="radio"
                name="institution_type"
                checked={formData.institution_type === 'MESCTI_HIGHER_ED'}
                onChange={() => onUpdateField('institution_type', 'MESCTI_HIGHER_ED')}
                className="mt-1 accent-teal-700"
              />
              <div>
                <span className="block text-xs font-bold text-stone-900">
                  Ensino Superior / IES (MESCTI)
                </span>
                <span className="block text-[11px] text-stone-600">
                  Elegível para Google, Microsoft 365 A1, GitHub &amp; SheerID (Canva Campus requer licença própria).
                </span>
              </div>
            </label>
          </div>
        </div>

        <FormField id="school-nif" label="NIF Institucional (Angola)" required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="text"
              required
              mono
              invalid={invalid}
              aria-describedby={describedBy}
              inputMode="numeric"
              placeholder="Ex.: 5412345678"
              value={formData.nif}
              onChange={(e) => onUpdateField('nif', e.target.value)}
            />
          )}
        </FormField>

        <FormField id="school-alvara" label="N.º do Alvará / Despacho MED ou MESCTI" required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="text"
              required
              invalid={invalid}
              aria-describedby={describedBy}
              placeholder="Ex.: Alvará MED n.º 432/2024 ou Decreto Presidencial"
              value={formData.alvara_med_mescti}
              onChange={(e) => onUpdateField('alvara_med_mescti', e.target.value)}
            />
          )}
        </FormField>

        <FormField id="school-province" label="Província">
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              invalid={invalid}
              aria-describedby={describedBy}
              value={formData.province}
              onChange={(e) => onUpdateField('province', e.target.value)}
            >
              {PROVINCE_LIST.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField id="school-municipality" label="Município">
          {({ id, describedBy, invalid }) =>
            municipalities.length > 0 ? (
              <Select
                id={id}
                invalid={invalid}
                aria-describedby={describedBy}
                value={formData.municipality}
                onChange={(e) => onUpdateField('municipality', e.target.value)}
              >
                {municipalities.map((mun) => (
                  <option key={mun} value={mun}>
                    {mun}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id={id}
                type="text"
                invalid={invalid}
                aria-describedby={describedBy}
                placeholder="Ex.: Sede Municipal"
                value={formData.municipality}
                onChange={(e) => onUpdateField('municipality', e.target.value)}
              />
            )
          }
        </FormField>
      </div>
    </fieldset>
  );
}
