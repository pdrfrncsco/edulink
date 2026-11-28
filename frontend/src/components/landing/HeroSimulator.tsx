'use client';

import React from 'react';
import { Button, ButtonLink, StatusBadge } from '@/components/ui';
import SimulatorPreviewCard from './SimulatorPreviewCard';
import { ADMIN_URL, type TutelaType } from './data';

interface HeroSimulatorProps {
  simSchoolName: string;
  simTutela: TutelaType;
  simColor: string;
  simEduDomain: string;
  simPreviewDomain: string;
  onChangeSchoolName: (value: string) => void;
  onChangeTutela: (value: TutelaType) => void;
  onChangeColor: (hex: string) => void;
  onOpenDemo: (prefillSchool?: string) => void;
}

/** Hero section with real-time school digital identity and `.edu.ao` domain simulator. */
export default function HeroSimulator({
  simSchoolName,
  simTutela,
  simColor,
  simEduDomain,
  simPreviewDomain,
  onChangeSchoolName,
  onChangeTutela,
  onChangeColor,
  onOpenDemo,
}: HeroSimulatorProps) {
  return (
    <section
      id="simulador"
      className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-b from-white via-stone-50 to-teal-50/40"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-6">
          <StatusBadge tone="brand" size="md" dot className="px-3.5 py-1">
            Ano Lectivo 2026/2027 · Luanda · Faturação AGT
          </StatusBadge>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-stone-900 leading-[1.12]">
            O domínio <span className="text-teal-700">.edu.ao</span>, o site da escola e as contas
            Google, Microsoft e Canva,{' '}
            <span className="underline decoration-amber-400 decoration-4 underline-offset-4">
              num único pedido
            </span>
            .
          </h1>

          <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-xl">
            Com o Alvará do MED ou MESCTI, tratamos do registo na DNS.AO, publicamos o site
            institucional, criamos os e-mails de alunos e professores e preparamos o dossiê da{' '}
            <strong>APD (Lei n.º 22/11)</strong>. Pagamento integral em Kwanzas.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button type="button" size="lg" onClick={() => onOpenDemo()}>
              Agendar demonstração na escola
            </Button>
            <ButtonLink href={ADMIN_URL} variant="outline" size="lg" className="px-6 font-bold text-stone-800">
              Abrir conta da secretaria
            </ButtonLink>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-stone-200/80 text-xs">
            <div>
              <p className="text-lg sm:text-xl font-bold text-stone-900">5 minutos</p>
              <p className="text-stone-500">Para ver a página de demonstração</p>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold text-stone-900">Em Kwanzas</p>
              <p className="text-stone-500">Multicaixa Express, KWiK e Fatura AGT</p>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold text-stone-900">Lei n.º 22/11</p>
              <p className="text-stone-500">Dossiê APD e autorizações dos pais</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <SimulatorPreviewCard
            simSchoolName={simSchoolName}
            simTutela={simTutela}
            simColor={simColor}
            simEduDomain={simEduDomain}
            simPreviewDomain={simPreviewDomain}
            onChangeSchoolName={onChangeSchoolName}
            onChangeTutela={onChangeTutela}
            onChangeColor={onChangeColor}
            onOpenDemo={onOpenDemo}
          />
        </div>
      </div>
    </section>
  );
}
