import React from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}/${currentYear + 1}`;

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <a href="/admin" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:bg-teal-800 transition">
              E
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-base text-stone-900 tracking-tight">EduLink</span>
              <span className="hidden sm:inline text-[11px] font-semibold text-stone-500">
                Infraestrutura Educacional · Angola
              </span>
            </div>
          </a>

          <div className="flex items-center gap-3 text-xs text-stone-600">
            <span className="hidden md:inline font-medium text-stone-500">
              Ano Lectivo {academicYear}
            </span>
            <span className="hidden md:inline h-3.5 w-px bg-stone-300" aria-hidden="true" />
            <a
              href="/portal"
              className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 font-semibold text-stone-700 hover:bg-stone-100 transition"
            >
              Portal do Aluno / Docente
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <footer className="border-t border-stone-200 bg-white py-4 px-4 text-center text-xs text-stone-500">
        EduLink Angola © {currentYear} — Identidade Académica &amp; Nuvem Escolar. Em conformidade com a Lei n.º 22/11 (APD).
      </footer>
    </div>
  );
}