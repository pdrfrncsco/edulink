import React from 'react';

export default function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900">
      <header className="border-b border-stone-800 bg-stone-900 text-stone-100 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <a href="/ops" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-stone-950 font-extrabold text-base shadow-sm group-hover:bg-amber-400 transition">
              E
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-base text-white tracking-tight">EduLink Ops</span>
              <span className="hidden sm:inline rounded-full bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                Backoffice Interno
              </span>
            </div>
          </a>

          <div className="flex items-center gap-2.5 text-xs">
            <a
              href="/admin"
              className="rounded-lg border border-stone-700 bg-stone-800 px-2.5 py-1.5 font-semibold text-stone-200 hover:bg-stone-700 transition"
            >
              Painel Escola (/admin)
            </a>
            <a
              href="/portal"
              className="rounded-lg border border-stone-700 bg-stone-800 px-2.5 py-1.5 font-semibold text-stone-200 hover:bg-stone-700 transition"
            >
              Portal PWA
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <footer className="border-t border-stone-200 bg-white py-4 px-4 text-center text-xs text-stone-500">
        EduLink Operations © {currentYear} — Consola Multi-Tenant, Revisão Documental, SAF-T AGT &amp; Parceiros POS.
      </footer>
    </div>
  );
}
