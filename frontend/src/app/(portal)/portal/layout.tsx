import React from 'react';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-between">
      <header className="bg-white border-b border-stone-200 py-3 px-4 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white font-bold flex items-center justify-center text-sm">
              E
            </div>
            <span className="font-bold text-sm text-stone-900">EduLink Passaporte</span>
          </div>
          <span className="text-[11px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
            PWA Académico
          </span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="text-center py-4 text-[11px] text-stone-500">
        Cartão Digital Verificável EduLink • Angola 2026
      </footer>
    </div>
  );
}
