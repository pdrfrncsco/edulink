import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicSchoolData, getSiteNavigationContext } from '@/lib/siteServerContext';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const school = await getPublicSchoolData(domain);
  if (!school) {
    return { title: 'Política de Privacidade — Não encontrada' };
  }
  return {
    title: `Política de Privacidade e Proteção de Dados — ${school.name}`,
    description: `Enquadramento de tratamento de dados escolares de ${school.name} ao abrigo da Lei n.º 22/11 (APD, Angola).`,
  };
}

export default async function SchoolPrivacyPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const school = await getPublicSchoolData(domain);

  if (!school || !school.is_active) {
    notFound();
  }

  const effectiveHost = school.effective_site_host || school.domain || domain;
  const { homeHref } = await getSiteNavigationContext(domain, effectiveHost);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto bg-white border border-stone-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
              Conformidade APD · Lei n.º 22/11 (Angola)
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">
              Política de Privacidade e Proteção de Dados Escolares
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              {school.name} ({effectiveHost}) • {school.alvara_med_mescti}
            </p>
          </div>
          <a
            href={homeHref}
            className="rounded-xl border border-stone-300 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Voltar ao Site
          </a>
        </div>

        <section className="space-y-2 text-sm text-stone-700 leading-relaxed">
          <h2 className="text-base font-bold text-stone-900">1. Responsável pelo Tratamento</h2>
          <p>
            <strong>{school.name}</strong>, instituição de ensino localizada em {school.municipality}, {school.province} (Angola), atua como Responsável pelo Tratamento dos dados pessoais dos seus estudantes, encarregados de educação e docentes, nos termos da <strong>Lei n.º 22/11, de 17 de Junho</strong> (Lei da Proteção de Dados Pessoais). A infraestrutura tecnológica de identidade académica é operada pela <strong>EduLink Angola</strong> enquanto subcontratante técnica.
          </p>
        </section>

        <section className="space-y-2 text-sm text-stone-700 leading-relaxed">
          <h2 className="text-base font-bold text-stone-900">2. Finalidade do Tratamento</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Criação e gestão de contas de correio eletrónico institucional e acesso ao Google Workspace for Education, Microsoft 365 Education e Canva para Educação.</li>
            <li>Emissão e verificação de autenticidade do Passaporte Académico Digital (QR Code verificável) mediante validação restrita ao estado da matrícula (Ativa/Suspensa).</li>
            <li>Gestão de consentimentos parentais para estudantes menores de idade.</li>
          </ul>
        </section>

        <section className="space-y-2 text-sm text-stone-700 leading-relaxed">
          <h2 className="text-base font-bold text-stone-900">3. Minimização, Segurança e Retenção</h2>
          <p>
            São recolhidos apenas os dados estritamente necessários à identificação académica (nome completo, vínculo escolar, turma/departamento e e-mail institucional). Quando uma matrícula é encerrada ou suspensa, o acesso às ferramentas em nuvem e a validação do QR Code são revogados automaticamente.
          </p>
        </section>

        <section className="space-y-2 text-sm text-stone-700 leading-relaxed">
          <h2 className="text-base font-bold text-stone-900">4. Direitos dos Titulares e Contacto</h2>
          <p>
            Estudantes, docentes e encarregados de educação podem solicitar acesso, retificação, atualização ou eliminação dos seus dados junto da secretaria da instituição através do e-mail{' '}
            <a href={`mailto:${school.contact_email}`} className="font-semibold text-teal-800 underline">
              {school.contact_email}
            </a>
            {school.phone ? ` ou pelo telefone ${school.phone}` : ''}.
          </p>
          {school.apd_notified && (
            <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              Registo/Notificação APD: {school.apd_dossier_number || 'Submetido junto da Agência de Proteção de Dados (APD)'}.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}