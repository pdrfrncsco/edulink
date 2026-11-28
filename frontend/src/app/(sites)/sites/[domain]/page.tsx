import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': isHigherEd ? 'CollegeOrUniversity' : 'School',
    name: school.name,
    url: canonicalOrigin,
    logo: school.logo_url || undefined,
    email: school.contact_email,
    telephone: school.phone || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: school.address || undefined,
      addressLocality: school.municipality || 'Talatona',
      addressRegion: school.province || 'Luanda',
      addressCountry: 'AO',
    },
    identifier: [
      {
        '@type': 'PropertyValue',
        name: isHigherEd ? 'Reconhecimento MESCTI' : 'Alvará MED',
        value: school.alvara_med_mescti,
      },
      ...(school.apd_dossier_number
        ? [{ '@type': 'PropertyValue', name: 'Registo APD (Lei n.º 22/11)', value: school.apd_dossier_number }]
        : []),
    ],
  };

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
          Pré-visualização institucional em <strong>{effectiveHost}</strong> — domínio definitivo <code>.edu.ao</code> em fase de registo.
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {school.logo_url ? (
              <img
                src={school.logo_url}
                alt={`Logótipo de ${school.name}`}
                className="w-12 h-12 rounded-2xl border border-stone-200 bg-white object-contain p-1 shrink-0 shadow-sm"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow shrink-0"
                style={{ backgroundColor: brandColor, color: brandForeground }}
              >
                {school.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-xl text-stone-900 leading-tight truncate">
                {school.name}
              </h1>
              <div className="flex items-center gap-2 text-xs text-stone-500 truncate">
                <span className="font-mono text-teal-800 font-semibold truncate">{effectiveHost}</span>
                <span aria-hidden="true">•</span>
                <span className="truncate">{school.municipality}, {school.province}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={portalUrl}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold border border-stone-300 text-stone-700 hover:bg-stone-50 transition"
            >
              Portal PWA
            </a>
            <a
              href={adminUrl}
              className="hidden sm:inline-block px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition hover:opacity-95"
              style={{ backgroundColor: brandColor, color: brandForeground }}
            >
              Secretaria Online
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10 w-full flex-1">
        {/* Hero */}
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
            <a
              href={portalUrl}
              className="px-6 py-3 rounded-xl font-bold text-sm shadow transition hover:opacity-95"
              style={{ backgroundColor: brandColor, color: brandForeground }}
            >
              Aceder ao Cartão Digital &amp; Webmail
            </a>
            <a
              href="#acreditacao"
              className="px-6 py-3 rounded-xl font-bold text-sm border border-stone-300 text-stone-700 hover:bg-stone-50 transition"
            >
              Ver Alvará e Acreditação Oficial
            </a>
            <a
              href={privacyHref}
              className="px-5 py-3 rounded-xl font-semibold text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition"
            >
              Privacidade (APD)
            </a>
          </div>
        </section>

        {/* Ecossistema Digital */}
        <section aria-labelledby="ecosystem-heading" className="space-y-4">
          <h3 id="ecosystem-heading" className="text-sm font-bold uppercase tracking-wider text-stone-600">
            Serviços Digitais para Estudantes e Docentes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <article className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                G
              </div>
              <h4 className="font-bold text-stone-900 text-base">Google Workspace for Education</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Contas institucionais{' '}
                <span className="font-mono text-stone-800">@{school.domain || effectiveHost}</span> com Gmail, Google Classroom, Drive, Documentos e Meet para toda a comunidade educativa.
              </p>
            </article>

            <article className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                M
              </div>
              <h4 className="font-bold text-stone-900 text-base">Microsoft 365 Education (A1)</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Acesso web a Word, Excel, PowerPoint, OneDrive e Microsoft Teams com licenciamento académico oficial para docentes e alunos.
              </p>
            </article>

            <article className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                P
              </div>
              <h4 className="font-bold text-stone-900 text-base">
                {isCanvaFree ? 'Canva Educação & Passaporte QR' : 'Passaporte Digital & Verificação Académica'}
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                {isCanvaFree
                  ? 'Acesso gratuito ao Canva para Educação via login institucional, além de Cartão Académico verificável por QR Code.'
                  : 'Cartão Académico Digital verificável por QR Code e elegibilidade institucional para GitHub Education, Figma e programas universitários.'}
              </p>
            </article>
          </div>
        </section>

        {/* Acreditação Oficial e Conformidade APD */}
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
            Este portal institucional confirma o estatuto educativo oficial de <strong>{school.name}</strong>, os seus contactos administrativos e o enquadramento perante a Agência de Proteção de Dados (APD) para fins de verificação académica junto da DNS.AO, Google Workspace for Education, Microsoft 365 Education e parceiros educativos.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-white p-4 rounded-xl border border-stone-200">
              <span className="block text-[11px] font-semibold uppercase text-stone-500">
                {isHigherEd ? 'Reconhecimento MESCTI' : 'Alvará / Despacho MED'}
              </span>
              <span className="block text-sm font-bold text-stone-900 mt-0.5">{school.alvara_med_mescti}</span>
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
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-8 text-xs text-stone-600">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left space-y-1">
            <p className="font-semibold text-stone-800">{school.name}</p>
            <p>
              E-mail: <a href={`mailto:${school.contact_email}`} className="underline">{school.contact_email}</a>
              {school.phone ? ` • Tel.: ${school.phone}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-stone-500">
            <a href={privacyHref} className="hover:text-stone-900 underline">
              Política de Privacidade (APD)
            </a>
            <a href={portalUrl} className="hover:text-stone-900 underline">
              Portal do Aluno
            </a>
            <a href={adminUrl} className="hover:text-stone-900 underline">
              Secretaria
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}