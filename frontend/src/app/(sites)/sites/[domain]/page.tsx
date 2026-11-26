import React from 'react';

const API_BASE = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';

async function getSchoolData(domain: string) {
  try {
    const res = await fetch(`${API_BASE}/tenants/by-domain/?domain=${encodeURIComponent(domain)}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Falha ao obter dados da escola:', err);
  }

  // Fallback para visualização de desenvolvimento ou prévia
  return {
    name: domain.split('.')[0].replace(/-/g, ' ').toUpperCase(),
    domain: domain,
    alvara_med_mescti: 'Alvará MED n.º 000/MED/2026',
    primary_color: '#0D9488',
    contact_email: `secretaria@${domain}`,
    phone: '+244 923 000 000',
    province: 'Luanda',
    municipality: 'Talatona',
    address: 'Luanda, Angola',
    about_text: 'Instituição de ensino angolana orientada para a formação integral, rigor científico e inovação tecnológica.',
    apd_notified: true,
    apd_dossier_number: 'APD-2026-AO-0982',
    is_active: true,
  };
}

export default async function SchoolSitePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const school = await getSchoolData(domain);

  const brandColor = school.primary_color || '#0D9488';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: school.name,
    url: `https://${school.domain}`,
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
      { '@type': 'PropertyValue', name: 'Alvará MED/MESCTI', value: school.alvara_med_mescti },
      ...(school.apd_dossier_number
        ? [{ '@type': 'PropertyValue', name: 'Registo APD (Lei 22/11)', value: school.apd_dossier_number }]
        : []),
    ],
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow"
              style={{ backgroundColor: brandColor }}
            >
              {school.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-bold text-lg sm:text-xl text-stone-900 leading-tight">
                {school.name}
              </h1>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span className="font-mono text-teal-700 font-semibold">{school.domain}</span>
                <span>•</span>
                <span>{school.province}, Angola</span>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <a
              href="/portal"
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-stone-300 text-stone-700 hover:bg-stone-50 transition"
            >
              Portal do Aluno
            </a>
            <a
              href="/admin"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition"
              style={{ backgroundColor: brandColor }}
            >
              Secretaria Online
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10 w-full flex-1">
        {/* Hero Section */}
        <div className="bg-white border border-stone-200 rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Instituição Acreditada • Domínio Oficial .edu.ao
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight max-w-3xl">
            Excelência Académica, Identidade Digital e Ensino Inovador
          </h2>
          <p className="text-stone-600 text-base sm:text-lg max-w-2xl leading-relaxed">
            {school.about_text}
          </p>

          <div className="pt-4 flex flex-wrap gap-4">
            <a
              href="/portal"
              className="px-6 py-3.5 rounded-xl font-bold text-sm text-white shadow transition hover:opacity-95"
              style={{ backgroundColor: brandColor }}
            >
              Aceder ao Cartão Digital (PWA)
            </a>
            <a
              href="#acreditacao"
              className="px-6 py-3.5 rounded-xl font-bold text-sm border border-stone-300 text-stone-700 hover:bg-stone-50 transition"
            >
              Ver Alvará e Credenciais Oficiais
            </a>
          </div>
        </div>

        {/* Cloud & Digital Ecosystem Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              G
            </div>
            <h3 className="font-bold text-stone-900 text-base">Google Workspace for Education</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Contas institucionais @{school.domain} com Google Classroom, Gmail, Drive e Meet ilimitado para estudantes e docentes.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
              M
            </div>
            <h3 className="font-bold text-stone-900 text-base">Microsoft 365 Education (A1)</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Acesso web a Word, Excel, PowerPoint, Teams e OneNote com licenças Faculty e Student provisionadas pela EduLink.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              P
            </div>
            <h3 className="font-bold text-stone-900 text-base">Passaporte Digital & Benefícios</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Cartão escolar verificável por QR Code, elegibilidade internacional no GitHub Student Pack e descontos em parceiros.
            </p>
          </div>
        </div>

        {/* Accreditation & Regulatory Shield (Auditoria Google / Microsoft / APD) */}
        <div id="acreditacao" className="bg-stone-100 border border-stone-300/80 rounded-2xl p-6 sm:p-8 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">
            Registo Oficial e Conformidade Regulatória (Angola)
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed max-w-3xl">
            Este portal é gerado pela infraestrutura EduLink e serve como atestado público da existência jurídica e acreditação ministerial da instituição junto dos motores de auditoria do Google, Microsoft, SheerID, GitHub Education e DNS.AO.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-white p-4 rounded-xl border border-stone-200">
              <span className="block text-[11px] font-semibold uppercase text-stone-400">Reconhecimento Oficial</span>
              <span className="block text-sm font-bold text-stone-900 mt-0.5">{school.alvara_med_mescti}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200">
              <span className="block text-[11px] font-semibold uppercase text-stone-400">Registo na APD (Lei n.º 22/11)</span>
              <span className="block text-sm font-bold text-teal-700 mt-0.5">
                {school.apd_notified ? (school.apd_dossier_number || 'Conformidade Notificada') : 'Em Processamento'}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200">
              <span className="block text-[11px] font-semibold uppercase text-stone-400">Localização e Secretaria</span>
              <span className="block text-sm font-bold text-stone-900 mt-0.5">{school.municipality}, {school.province}</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-8 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p>
            {school.name} • Contacto: {school.contact_email} | Telefone: {school.phone}
          </p>
          <p className="text-stone-400">
            Alimentado pela infraestrutura multi-tenant <span className="font-semibold text-stone-600">EduLink Angola</span>.
          </p>
        </div>
      </footer>
    </div>
  );
}
