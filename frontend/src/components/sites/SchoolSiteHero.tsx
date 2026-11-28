import React from 'react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import type { PublicSchoolData } from '@/lib/siteServerContext';

interface SchoolSiteHeroProps {
  school: PublicSchoolData;
  isHigherEd: boolean;
  brandColor: string;
  brandForeground: string;
  portalUrl: string;
  privacyHref: string;
}

/** Public institutional hero section presenting accreditation badge, mission, and actions. */
export default function SchoolSiteHero({
  school,
  isHigherEd,
  brandColor,
  brandForeground,
  portalUrl,
  privacyHref,
}: SchoolSiteHeroProps) {
  return (
    <section className="bg-white border border-stone-200 rounded-3xl p-7 sm:p-12 shadow-sm space-y-6">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
        {isHigherEd ? 'Ensino Superior Acreditado (MESCTI)' : 'Instituição Acreditada pelo MED'}
        {school.domain ? ` • ${school.domain}` : ''}
      </div>

      <h2 className="text-2xl sm:text-4xl font-bold text-stone-900 tracking-tight max-w-3xl">
        {school.name}: Ensino de Qualidade e Identidade Académica Digital
      </h2>

      <p className="text-stone-600 text-sm sm:text-lg max-w-2xl leading-relaxed">
        {school.about_text ||
          'Instituição de ensino oficialmente acreditada em Angola, comprometida com a excelência académica, inovação pedagógica e literacia digital.'}
      </p>

      <div className="pt-2 flex flex-wrap gap-3">
        <ButtonLink
          href={portalUrl}
          size="lg"
          className="px-6 font-bold hover:opacity-95"
          style={{ backgroundColor: brandColor, color: brandForeground }}
        >
          Aceder ao Cartão Digital &amp; Webmail
        </ButtonLink>
        <ButtonLink href="#acreditacao" variant="outline" size="lg" className="px-6 font-bold">
          Ver Alvará e Acreditação Oficial
        </ButtonLink>
        <ButtonLink href={privacyHref} variant="ghost" size="lg" className="px-5">
          Privacidade (APD)
        </ButtonLink>
      </div>
    </section>
  );
}
