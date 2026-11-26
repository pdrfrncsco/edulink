import React from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-stone-200 bg-white/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center text-white font-bold text-xl shadow-sm">
              E
            </div>
            <div>
              <span className="font-bold text-lg text-stone-900 tracking-tight">EduLink</span>
              <span className="ml-2 text-xs bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded-full">
                Portal da Secretaria
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-stone-600">
            <span className="hidden sm:inline">Angola • Ano Lectivo 2026/2027</span>
            <div className="h-4 w-px bg-stone-300"></div>
            <span className="text-teal-700 font-medium">Sprint 1 (MVP)</span>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
        EduLink Angola © 2026 — Plataforma de Identidade Académica & Benefícios Digitais. Em conformidade com a Lei n.º 22/11 (APD).
      </footer>
    </div>
  );
}
