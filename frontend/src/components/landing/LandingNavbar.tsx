'use client';

import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ADMIN_URL, PORTAL_URL } from './data';

const NAV_LINKS = [
  { href: '#simulador', label: 'Simulador' },
  { href: '#ecossistema', label: 'Benefícios' },
  { href: '#como-funciona', label: 'Como Funciona' },
  { href: '#calculadora', label: 'Calculadora AOA' },
  { href: '#planos', label: 'Planos' },
  { href: '#faq', label: 'FAQ' },
];

/** Sticky public navbar with keyboard-accessible mobile disclosure menu. */
export default function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <a href="#" className="flex items-center gap-2.5 min-h-[44px]">
          <div className="w-9 h-9 rounded-xl bg-teal-700 text-white font-bold text-lg flex items-center justify-center shadow-sm">
            E
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-stone-900 block leading-none">
              EduLink
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700">
              Angola · .edu.ao
            </span>
          </div>
        </a>

        <nav
          aria-label="Navegação principal"
          className="hidden lg:flex items-center gap-7 text-xs font-semibold text-stone-600"
        >
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-teal-800 transition py-2">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden sm:flex items-center gap-2.5">
          <a
            href={PORTAL_URL}
            className="inline-flex items-center min-h-[40px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            Portal Aluno / Docente
          </a>
          <a
            href={ADMIN_URL}
            className="inline-flex items-center min-h-[40px] px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition shadow-sm"
          >
            Entrar na Secretaria
          </a>
        </div>

        <button
          type="button"
          aria-expanded={mobileMenuOpen}
          aria-controls="landing-mobile-nav"
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="lg:hidden inline-flex items-center gap-1.5 min-h-[44px] rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-800"
        >
          {mobileMenuOpen ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Menu className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{mobileMenuOpen ? 'Fechar' : 'Menu'}</span>
        </button>
      </div>

      {mobileMenuOpen && (
        <nav
          id="landing-mobile-nav"
          aria-label="Navegação móvel"
          className="lg:hidden border-t border-stone-200 bg-white px-4 py-4 space-y-3 text-sm"
        >
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-stone-700">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center px-3 rounded-lg hover:bg-stone-50"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
            <a
              href={PORTAL_URL}
              className="min-h-[44px] flex items-center justify-center rounded-xl border border-stone-300 text-xs font-semibold text-stone-800"
            >
              Portal PWA
            </a>
            <a
              href={ADMIN_URL}
              className="min-h-[44px] flex items-center justify-center rounded-xl bg-teal-700 text-white text-xs font-semibold"
            >
              Secretaria
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
