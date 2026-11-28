'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import { slugifySchool } from '@/lib/formatters';
import {
  ADMIN_URL,
  HOW_IT_WORKS_STEPS,
  PORTAL_URL,
  PROBLEM_HIGHLIGHTS,
  ROOT_DOMAIN,
  type TutelaType,
} from './data';
import DemoModal from './DemoModal';
import FaqAccordion from './FaqAccordion';
import HeroSimulator from './HeroSimulator';
import LandingNavbar from './LandingNavbar';
import PersonaTabs from './PersonaTabs';
import PricingSection from './PricingSection';
import RoiCalculator from './RoiCalculator';

/** Commercial landing page composed from modular accessible sections. */
export default function EduLinkLanding() {
  const [simSchoolName, setSimSchoolName] = useState('Colégio Horizonte de Luanda');
  const [simTutela, setSimTutela] = useState<TutelaType>('MED_K12');
  const [simColor, setSimColor] = useState('#0D9488');
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoPrefillSchool, setDemoPrefillSchool] = useState('Colégio Horizonte de Luanda');

  const simSlug = useMemo(() => slugifySchool(simSchoolName), [simSchoolName]);
  const simEduDomain = `${simSlug}.edu.ao`;
  const simPreviewDomain = `${simSlug}.${ROOT_DOMAIN}`;

  const openDemoWithContext = (prefillSchool?: string) => {
    setDemoPrefillSchool(prefillSchool || simSchoolName);
    setDemoModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      <LandingNavbar />

      <main className="flex-1">
        <HeroSimulator
          simSchoolName={simSchoolName}
          simTutela={simTutela}
          simColor={simColor}
          simEduDomain={simEduDomain}
          simPreviewDomain={simPreviewDomain}
          onChangeSchoolName={setSimSchoolName}
          onChangeTutela={setSimTutela}
          onChangeColor={setSimColor}
          onOpenDemo={openDemoWithContext}
        />

        {/* 4 Core Barriers Eliminated */}
        <section className="bg-stone-900 text-stone-100 py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {PROBLEM_HIGHLIGHTS.map((item) => (
                <div key={item.tag} className="space-y-1.5 border-l-2 border-teal-500 pl-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                    {item.tag}
                  </span>
                  <h2 className="text-sm font-bold text-white">{item.title}</h2>
                  <p className="text-xs text-stone-300 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <PersonaTabs />

        {/* 4-Step Turnkey Process */}
        <section id="como-funciona" className="bg-white border-y border-stone-200 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                Processo Assistido de Ponta a Ponta
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                Da entrega do Alvará à escola digital ativa em 4 passos
              </h2>
              <p className="text-sm text-stone-600">
                A titularidade do domínio e das contas permanece sempre em nome da instituição. A
                equipa EduLink executa toda a parte técnica e documental.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {HOW_IT_WORKS_STEPS.map((item, idx) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-stone-200 bg-stone-50 p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-100 text-teal-900">
                        {item.step}
                      </span>
                      <span className="text-xs font-mono font-bold text-stone-500">0{idx + 1}</span>
                    </div>
                    <h3 className="text-base font-bold text-stone-900">{item.title}</h3>
                    <p className="text-xs text-stone-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <RoiCalculator onOpenDemo={openDemoWithContext} />

        <PricingSection onOpenDemo={openDemoWithContext} />

        <FaqAccordion />

        {/* Final Call To Action */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-3xl bg-gradient-to-br from-teal-800 to-stone-900 text-white p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                Pronto para o Ano Lectivo 2026/2027
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Coloque a sua instituição online em .edu.ao esta semana
              </h2>
              <p className="text-sm text-teal-100/90">
                Crie a conta da secretaria para testar o Onboarding Wizard ou agende uma demonstração
                presencial/online em Luanda com o site da sua escola já pré-montado.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Button
                type="button"
                size="lg"
                onClick={() => openDemoWithContext()}
                className="bg-white text-stone-950 hover:bg-stone-100 font-extrabold"
              >
                Agendar Demonstração
              </Button>
              <a
                href={ADMIN_URL}
                className="min-h-[44px] inline-flex items-center justify-center px-6 py-3 rounded-xl border border-white/30 bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition"
              >
                Abrir Portal da Secretaria
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white py-10 text-xs text-stone-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-teal-700 text-white font-bold flex items-center justify-center">
              E
            </span>
            <p>
              <strong>EduLink Angola</strong> © {new Date().getFullYear()} · Infraestrutura de
              Identidade Académica &amp; Nuvem Escolar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 font-semibold text-stone-600">
            <a href={ADMIN_URL} className="hover:text-teal-800 py-1">
              Secretaria Escolar
            </a>
            <a href={PORTAL_URL} className="hover:text-teal-800 py-1">
              Portal PWA
            </a>
            <a href="/verify" className="hover:text-teal-800 py-1">
              Verificar Cartão QR
            </a>
            <a href="#faq" className="hover:text-teal-800 py-1">
              Conformidade APD
            </a>
          </div>
        </div>
      </footer>

      <DemoModal
        open={demoModalOpen}
        initialSchool={demoPrefillSchool}
        onClose={() => setDemoModalOpen(false)}
      />
    </div>
  );
}
