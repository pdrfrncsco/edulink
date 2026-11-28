import React from 'react';

interface SchoolEcosystemGridProps {
  mailDomain: string;
  isCanvaFree: boolean;
}

/** Public overview of Google Workspace, Microsoft 365 A1, and Canva / QR Passport services. */
export default function SchoolEcosystemGrid({
  mailDomain,
  isCanvaFree,
}: SchoolEcosystemGridProps) {
  return (
    <section aria-labelledby="ecosystem-heading" className="space-y-4">
      <h3
        id="ecosystem-heading"
        className="text-sm font-bold uppercase tracking-wider text-stone-600"
      >
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
            <span className="font-mono text-stone-800">@{mailDomain}</span> com Gmail, Google
            Classroom, Drive, Documentos e Meet para toda a comunidade educativa.
          </p>
        </article>

        <article className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
            M
          </div>
          <h4 className="font-bold text-stone-900 text-base">Microsoft 365 Education (A1)</h4>
          <p className="text-xs text-stone-600 leading-relaxed">
            Acesso web a Word, Excel, PowerPoint, OneDrive e Microsoft Teams com licenciamento
            académico oficial para docentes e alunos.
          </p>
        </article>

        <article className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            P
          </div>
          <h4 className="font-bold text-stone-900 text-base">
            {isCanvaFree
              ? 'Canva Educação & Passaporte QR'
              : 'Passaporte Digital & Verificação Académica'}
          </h4>
          <p className="text-xs text-stone-600 leading-relaxed">
            {isCanvaFree
              ? 'Acesso gratuito ao Canva para Educação via login institucional, além de Cartão Académico verificável por QR Code.'
              : 'Cartão Académico Digital verificável por QR Code e elegibilidade institucional para GitHub Education, Figma e programas universitários.'}
          </p>
        </article>
      </div>
    </section>
  );
}
