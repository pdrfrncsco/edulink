'use client';

import React, { useState } from 'react';
import { Card, StatusBadge, TabPanel, Tabs } from '@/components/ui';
import { PERSONA_DATA, type PersonaKey } from './data';

const PERSONA_TABS: { id: PersonaKey; label: string }[] = [
  { id: 'direcao', label: 'Direção & Secretaria' },
  { id: 'docentes', label: 'Docentes' },
  { id: 'estudantes', label: 'Estudantes' },
];

/** Interactive persona switcher using accessible keyboard-navigable tabs and panels. */
export default function PersonaTabs() {
  const [activePersona, setActivePersona] = useState<PersonaKey>('direcao');

  return (
    <section id="ecossistema" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
            Uma Plataforma, Três Públicos Beneficiados
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Valor imediato para a direção, professores e estudantes
          </h2>
        </div>

        <Tabs
          idPrefix="landing-persona"
          ariaLabel="Selecionar perfil"
          variant="pills"
          items={PERSONA_TABS}
          value={activePersona}
          onChange={setActivePersona}
          className="self-start"
        />
      </div>

      {PERSONA_TABS.map((tab) => {
        const persona = PERSONA_DATA[tab.id];
        return (
          <TabPanel
            key={tab.id}
            idPrefix="landing-persona"
            tabId={tab.id}
            active={activePersona === tab.id}
          >
            <Card padding="lg" className="rounded-3xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="space-y-1 max-w-2xl">
                  <h3 className="text-lg font-bold text-stone-900">{persona.title}</h3>
                  <p className="text-sm text-stone-600">{persona.subtitle}</p>
                </div>
                <StatusBadge tone="brand" size="md">
                  {persona.highlight}
                </StatusBadge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {persona.items.map((feat, idx) => (
                  <Card key={feat.title} variant="muted" padding="md" className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-bold text-stone-900">{feat.title}</h4>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">{feat.desc}</p>
                  </Card>
                ))}
              </div>
            </Card>
          </TabPanel>
        );
      })}
    </section>
  );
}
