import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SchoolAccreditationSection from '@/components/sites/SchoolAccreditationSection';
import SchoolEcosystemGrid from '@/components/sites/SchoolEcosystemGrid';
import SchoolSiteFooter from '@/components/sites/SchoolSiteFooter';
import SchoolSiteHeader from '@/components/sites/SchoolSiteHeader';
import SchoolSiteHero from '@/components/sites/SchoolSiteHero';
import { buildSchoolStructuredData } from '@/components/sites/structuredData';
import { getContrastTextColor } from '@/lib/formatters';
import { getPublicSchoolData, getSiteNavigationContext } from '@/lib/siteServerContext';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const school = await getPublicSchoolData(domain);

  if (!school) {
    return {
      title: 'Instituição não encontrada — EduLink Angola',
      robots: { index: false, follow: false },
    };
  }

  const host = school.effective_site_host || school.domain || domain;
  const isDemo = !school.domain;
  const nav = await getSiteNavigationContext(domain, host);

  return {
    title: `${school.name} — Portal Oficial`,
    description:
      school.about_text ||
      `${school.name} (${school.municipality}, ${school.province}) — Instituição de ensino acreditada em Angola (${school.alvara_med_mescti}).`,
    alternates: {
      canonical: nav.canonicalOrigin,
    },
    robots: isDemo ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export default async function SchoolSitePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const school = await getPublicSchoolData(domain);

  if (!school || !school.is_active) {
    notFound();
  }

  const brandColor = school.primary_color || '#0D9488';
  const brandForeground = getContrastTextColor(brandColor);
  const effectiveHost = school.effective_site_host || school.domain || domain;
  const isDemo = !school.domain;
  const isHigherEd = school.institution_type === 'MESCTI_HIGHER_ED';
  const isCanvaFree = school.is_canva_k12_eligible ?? !isHigherEd;
  const { portalUrl, adminUrl, privacyHref, canonicalOrigin } = await getSiteNavigationContext(
    domain,
    effectiveHost
  );

  const structuredData = buildSchoolStructuredData(school, canonicalOrigin, isHigherEd);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-stone-50 text-stone-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />

      {isDemo && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-950 font-medium">
          Pré-visualização institucional em <strong>{effectiveHost}</strong> — domínio definitivo{' '}
          <code>.edu.ao</code> em fase de registo.
        </div>
      )}

      <SchoolSiteHeader
        school={school}
        effectiveHost={effectiveHost}
        brandColor={brandColor}
        brandForeground={brandForeground}
        portalUrl={portalUrl}
        adminUrl={adminUrl}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10 w-full flex-1">
        <SchoolSiteHero
          school={school}
          isHigherEd={isHigherEd}
          brandColor={brandColor}
          brandForeground={brandForeground}
          portalUrl={portalUrl}
          privacyHref={privacyHref}
        />

        <SchoolEcosystemGrid
          mailDomain={school.domain || effectiveHost}
          isCanvaFree={isCanvaFree}
        />

        <SchoolAccreditationSection
          school={school}
          isHigherEd={isHigherEd}
          privacyHref={privacyHref}
        />
      </main>

      <SchoolSiteFooter
        school={school}
        privacyHref={privacyHref}
        portalUrl={portalUrl}
        adminUrl={adminUrl}
      />
    </div>
  );
}
