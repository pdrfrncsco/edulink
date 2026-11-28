'use client';

import React from 'react';
import { FormField, Input, Textarea, cn } from '@/components/ui';
import { BRAND_COLORS, ROOT_DOMAIN, slugifyHost, type OnboardingFormState } from './types';

interface StepDomainProps {
  formData: OnboardingFormState;
  suggestedContactEmail: string;
  onUpdateField: <K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]) => void;
  onSlugTouched: () => void;
}

/** Step 3: Preview subdomain, official .edu.ao domain, brand color, logo, and public summary. */
export default function StepDomain({
  formData,
  suggestedContactEmail,
  onUpdateField,
  onSlugTouched,
}: StepDomainProps) {
  return (
    <fieldset className="space-y-5">
      <legend className="text-sm font-bold text-stone-900">
        3. Domínio Institucional &amp; Identidade do Site
      </legend>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          id="preview-slug"
          label="Endereço Instantâneo (Demonstração)"
          required
          hint="Fica online de imediato para apresentação ao diretor e encarregados de educação."
        >
          {({ id, describedBy }) => (
            <div className="flex items-center rounded-xl border border-stone-300 overflow-hidden bg-white">
              <input
                id={id}
                type="text"
                aria-describedby={describedBy}
                value={formData.preview_slug}
                onChange={(e) => {
                  onSlugTouched();
                  onUpdateField('preview_slug', slugifyHost(e.target.value));
                }}
                placeholder="colegio-esperanca"
                className="w-full px-3.5 py-2.5 text-sm font-mono text-stone-900 focus:outline-none"
              />
              <span className="px-3 py-2.5 bg-stone-100 border-l border-stone-200 text-xs font-mono text-stone-600 shrink-0">
                .{ROOT_DOMAIN}
              </span>
            </div>
          )}
        </FormField>

        <FormField
          id="school-domain"
          label="Domínio Definitivo (.edu.ao ou Próprio)"
          hint="Obrigatório apenas na etapa de submissão ao Google Workspace e Microsoft 365."
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="text"
              mono
              invalid={invalid}
              aria-describedby={describedBy}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Ex.: colegio-esperanca.edu.ao (opcional agora)"
              value={formData.domain}
              onChange={(e) => onUpdateField('domain', e.target.value)}
              className="text-teal-800"
            />
          )}
        </FormField>

        <FormField id="school-email" label="E-mail Público da Secretaria (no Site)">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="email"
              invalid={invalid}
              aria-describedby={describedBy}
              placeholder={suggestedContactEmail}
              value={formData.contact_email}
              onChange={(e) => onUpdateField('contact_email', e.target.value)}
            />
          )}
        </FormField>

        <FormField id="school-logo" label="URL do Logótipo (Opcional)">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="url"
              invalid={invalid}
              aria-describedby={describedBy}
              placeholder="https://.../logo-escola.png"
              value={formData.logo_url}
              onChange={(e) => onUpdateField('logo_url', e.target.value)}
            />
          )}
        </FormField>

        <div className="md:col-span-2 space-y-2">
          <span className="block text-xs font-semibold uppercase text-stone-700">
            Cor Primária da Escola (Site e Cartão Digital)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {BRAND_COLORS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                onClick={() => onUpdateField('primary_color', preset.hex)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition',
                  formData.primary_color.toUpperCase() === preset.hex
                    ? 'border-stone-900 bg-stone-100 text-stone-900'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                )}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/15"
                  style={{ backgroundColor: preset.hex }}
                  aria-hidden="true"
                />
                {preset.label}
              </button>
            ))}
            <label
              htmlFor="school-primary-color"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-mono text-stone-700 cursor-pointer"
            >
              <input
                id="school-primary-color"
                type="color"
                aria-label="Cor primária personalizada"
                value={formData.primary_color}
                onChange={(e) => onUpdateField('primary_color', e.target.value.toUpperCase())}
                className="w-5 h-5 border-0 bg-transparent cursor-pointer"
              />
              {formData.primary_color}
            </label>
          </div>
        </div>

        <FormField
          id="school-about"
          label="Apresentação Institucional (Site Público)"
          className="md:col-span-2"
        >
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              rows={3}
              invalid={invalid}
              aria-describedby={describedBy}
              placeholder="Descreva brevemente os níveis de ensino, missão educativa e diferenciais da instituição..."
              value={formData.about_text}
              onChange={(e) => onUpdateField('about_text', e.target.value)}
            />
          )}
        </FormField>
      </div>
    </fieldset>
  );
}
