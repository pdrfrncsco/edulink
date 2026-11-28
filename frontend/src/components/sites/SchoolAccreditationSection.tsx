import React from 'react';
import type { PublicSchoolData } from '@/lib/siteServerContext';

interface SchoolAccreditationSectionProps {
  school: PublicSchoolData;
  isHigherEd: boolean;
  privacyHref: string;
}

/** Public MED/MESCTI accreditation, APD Lei n.º 22/11 compliance, and location section. */
export default function SchoolAccreditationSection({
  school,
  isHigherEd,
  privacyHref,
}: SchoolAccreditationSectionProps) {
  return (
    <section
      id="acreditacao"
      className="bg-stone-100 border border-stone-300/80 rounded-2xl p-6 sm:p-8 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
          Acreditação Oficial e Proteção de Dados (Angola)
        </h3>
        <a href={privacyHref} className="text-xs font-semibold text-teal-800 hover:underline">
          Consultar Política de Privacidade (Lei n.º 22/11) →
        </a>
      </div>

      <p className="text-xs text-stone-600 leading-relaxed max-w-3xl">
        Este portal institucional confirma o estatuto educativo oficial de{' '}
        <strong>{school.name}</strong>, os seus contactos administrativos e o enquadramento perante
        a Agência de Proteção de Dados (APD) para fins de verificação académica junto da DNS.AO,
        Google Workspace for Education, Microsoft 365 Education e parceiros educativos.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="bg-white p-4 rounded-xl border border-stone-200">
          <span className="block text-[11px] font-semibold uppercase text-stone-500">
            {isHigherEd ? 'Reconhecimento MESCTI' : 'Alvará / Despacho MED'}
          </span>
          <span className="block text-sm font-bold text-stone-900 mt-0.5">
            {school.alvara_med_mescti}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200">
          <span className="block text-[11px] font-semibold uppercase text-stone-500">
            Conformidade APD (Lei n.º 22/11)
          </span>
          <span className="block text-sm font-bold text-teal-800 mt-0.5">
            {school.apd_notified
              ? school.apd_dossier_number || 'Notificação Submetida'
              : 'Em Conformidade / Processo em Curso'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200">
          <span className="block text-[11px] font-semibold uppercase text-stone-500">
            Localização e Secretaria
          </span>
          <span className="block text-sm font-bold text-stone-900 mt-0.5">
            {school.municipality}, {school.province}
          </span>
          {school.address && (
            <span className="block text-xs text-stone-500 mt-0.5">{school.address}</span>
          )}
        </div>
      </div>
    </section>
  );
}
