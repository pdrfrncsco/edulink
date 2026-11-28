'use client';

import React from 'react';
import { Card, cn } from '@/components/ui';
import { getContrastTextColor } from '@/lib/formatters';
import { ROOT_DOMAIN, type OnboardingFormState } from './types';

interface StepPreviewProps {
  formData: OnboardingFormState;
  previewDevice: 'desktop' | 'mobile';
  previewHost: string;
  effectiveSlug: string;
  cleanedDomain: string;
  suggestedContactEmail: string;
  uploadedDocsCount: number;
  isLocalHostBrowser: boolean;
  onChangeDevice: (device: 'desktop' | 'mobile') => void;
}

/** Step 4: Live desktop/mobile preview of the school site and audit readiness summary. */
export default function StepPreview({
  formData,
  previewDevice,
  previewHost,
  effectiveSlug,
  cleanedDomain,
  suggestedContactEmail,
  uploadedDocsCount,
  isLocalHostBrowser,
  onChangeDevice,
}: StepPreviewProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-stone-900">
            4. Pré-visualização ao Vivo do Site Institucional
          </h3>
          <p className="text-xs text-stone-500">
            Confirme os dados abaixo antes de criar o tenant e publicar o portal escolar.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-stone-200 p-1 bg-stone-50 text-xs">
          <button
            type="button"
            onClick={() => onChangeDevice('desktop')}
            aria-pressed={previewDevice === 'desktop'}
            className={cn(
              'px-3 py-1 rounded-lg font-semibold',
              previewDevice === 'desktop' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
            )}
          >
            Desktop
          </button>
          <button
            type="button"
            onClick={() => onChangeDevice('mobile')}
            aria-pressed={previewDevice === 'mobile'}
            className={cn(
              'px-3 py-1 rounded-lg font-semibold',
              previewDevice === 'mobile' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'
            )}
          >
            Telemóvel
          </button>
        </div>
      </div>

      {/* Browser Mockup of Generated Site */}
      <div
        className={cn(
          'mx-auto rounded-2xl border border-stone-300 overflow-hidden shadow-md bg-white transition-all',
          previewDevice === 'mobile' ? 'max-w-[360px]' : 'w-full'
        )}
      >
        <div className="bg-stone-100 border-b border-stone-200 px-3 py-2 flex items-center gap-2 text-[11px] font-mono text-stone-600">
          <span className="flex gap-1" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-stone-300" />
          </span>
          <span className="flex-1 bg-white rounded-md px-2.5 py-0.5 border border-stone-200 truncate">
            {isLocalHostBrowser ? `/sites/${previewHost}` : `https://${previewHost}`}
          </span>
        </div>

        <div
          className="p-6 space-y-4"
          style={{
            backgroundColor: formData.primary_color,
            color: getContrastTextColor(formData.primary_color),
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt="Logótipo da instituição"
                  className="w-10 h-10 rounded-xl bg-white object-contain p-1 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-black/15 flex items-center justify-center font-bold text-sm shrink-0">
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
            <span className="hidden sm:inline-block rounded-lg bg-black/15 px-3 py-1.5 text-xs font-semibold shrink-0">
              Portal / Webmail
            </span>
          </div>

          <p className="text-xs sm:text-sm opacity-90 max-w-2xl">
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

      {/* Audit Readiness Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <Card variant="muted" padding="none" className="rounded-xl p-3">
          <span className="font-bold text-stone-800 block">DNS &amp; Domínio</span>
          <span className="text-stone-600">
            {cleanedDomain
              ? `Domínio definitivo definido (${cleanedDomain})`
              : `Modo demonstração (${effectiveSlug}.${ROOT_DOMAIN})`}
          </span>
        </Card>
        <Card variant="muted" padding="none" className="rounded-xl p-3">
          <span className="font-bold text-stone-800 block">Dossiê Documental</span>
          <span className="text-stone-600">
            {uploadedDocsCount > 0
              ? `${uploadedDocsCount} documento(s) pronto(s) para envio`
              : 'Nenhum ficheiro anexado ainda (pode enviar depois)'}
          </span>
        </Card>
        <Card variant="muted" padding="none" className="rounded-xl p-3">
          <span className="font-bold text-stone-800 block">Elegibilidade Cloud</span>
          <span className="text-stone-600">
            {formData.institution_type === 'MED_K12'
              ? 'Google + Microsoft A1 + Canva Educação (Grátis)'
              : 'Google + Microsoft A1 + GitHub/SheerID (IES)'}
          </span>
        </Card>
      </div>
    </div>
  );
}
