'use client';

import React from 'react';
import { Button, Input, StatusBadge, cn } from '@/components/ui';
import { ADMIN_URL, ROOT_DOMAIN, SIMULATOR_COLORS, type TutelaType } from './data';

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
        {/* Left Column: Value Proposition */}
        <div className="lg:col-span-6 space-y-6">
          <StatusBadge tone="brand" size="md" dot className="px-3.5 py-1">
            Programa Piloto Luanda 2026/2027 · Faturação AGT &amp; APD
          </StatusBadge>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-stone-900 leading-[1.1]">
            A sua escola em Angola com <span className="text-teal-700">.edu.ao</span>, Google,
            Microsoft e Canva —{' '}
            <span className="underline decoration-amber-400 decoration-4 underline-offset-4">
              sem burocracia
            </span>
            .
          </h1>

          <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-xl">
            A <strong>EduLink</strong> entrega num único pacote em Kwanzas o registo do domínio
            educacional, o site oficial automático, contas institucionais para alunos e professores,
            Passaporte Digital QR e blindagem perante a <strong>APD (Lei n.º 22/11)</strong>.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button type="button" size="lg" onClick={() => onOpenDemo()}>
              Solicitar Demonstração Gratuita
            </Button>
            <a
              href={ADMIN_URL}
              className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm font-bold hover:bg-stone-50 transition"
            >
              Criar Conta da Secretaria →
            </a>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-stone-200/80 text-xs">
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-stone-900">5 min</p>
              <p className="text-stone-500">Para gerar o site de demonstração</p>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-stone-900">100% AOA</p>
              <p className="text-stone-500">MCX, KWiK, IBAN e Fatura AGT</p>
            </div>
            <div>
              <p className="text-lg sm:text-xl font-extrabold text-stone-900">Lei 22/11</p>
              <p className="text-stone-500">Dossiê APD e termos parentais</p>
            </div>
          </div>
        </div>

        {/* Right Column: Live Simulator */}
        <div className="lg:col-span-6">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">
                  Simulador Instantâneo
                </span>
                <h2 className="text-sm font-bold text-stone-900">
                  Veja como fica a identidade digital da sua escola
                </h2>
              </div>
              <div className="flex items-center gap-1" role="group" aria-label="Cor da instituição">
                {SIMULATOR_COLORS.map((swatch) => {
                  const selected = simColor === swatch.hex;
                  return (
                    <button
                      key={swatch.hex}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Selecionar cor ${swatch.label}`}
                      onClick={() => onChangeColor(swatch.hex)}
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center border transition',
                        selected ? 'border-stone-900 bg-stone-100' : 'border-transparent hover:bg-stone-50'
                      )}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-black/15"
                        style={{ backgroundColor: swatch.hex }}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulator Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-3">
                <label
                  htmlFor="sim-school-name"
                  className="block text-[11px] font-semibold text-stone-600 mb-1"
                >
                  Nome da Instituição
                </label>
                <Input
                  id="sim-school-name"
                  type="text"
                  value={simSchoolName}
                  onChange={(e) => onChangeSchoolName(e.target.value)}
                  placeholder="Ex.: Colégio Esperança de Luanda"
                  className="py-2 text-sm font-medium"
                />
              </div>
              <div className="sm:col-span-2">
                <span className="block text-[11px] font-semibold text-stone-600 mb-1">Tutela</span>
                <div
                  role="group"
                  aria-label="Tipo de tutela da instituição"
                  className="grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-[11px] font-semibold min-h-[44px]"
                >
                  <button
                    type="button"
                    aria-pressed={simTutela === 'MED_K12'}
                    onClick={() => onChangeTutela('MED_K12')}
                    className={cn(
                      'py-1.5 rounded-lg transition',
                      simTutela === 'MED_K12' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                    )}
                  >
                    MED (K-12)
                  </button>
                  <button
                    type="button"
                    aria-pressed={simTutela === 'MESCTI_HIGHER_ED'}
                    onClick={() => onChangeTutela('MESCTI_HIGHER_ED')}
                    className={cn(
                      'py-1.5 rounded-lg transition',
                      simTutela === 'MESCTI_HIGHER_ED'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-600'
                    )}
                  >
                    MESCTI (IES)
                  </button>
                </div>
              </div>
            </div>

            {/* Combined Site + Digital Card Preview */}
            <div className="rounded-2xl border border-stone-200 overflow-hidden bg-stone-50">
              <div className="bg-stone-100 border-b border-stone-200 px-3 py-2 flex items-center justify-between text-[11px] font-mono text-stone-600">
                <span className="truncate">https://{simEduDomain}</span>
                <span className="shrink-0 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-sans font-bold">
                  SSL Automático
                </span>
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
                {/* School Digital Card */}
                <div
                  className="sm:col-span-7 rounded-2xl p-4 text-white flex flex-col justify-between space-y-3 shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${simColor} 0%, #111827 130%)`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-white/15 pb-2.5">
                    <div className="min-w-0">
                      <span className="text-[9px] uppercase tracking-wider text-white/80 block">
                        Passaporte Académico Digital
                      </span>
                      <p className="text-xs font-extrabold truncate">
                        {simSchoolName.trim() || 'Sua Instituição'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-400/20 border border-emerald-300/40 px-2 py-0.5 text-[9px] font-bold text-emerald-100">
                      ATIVO
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-white/80 uppercase">
                      E-mail Gerado Automaticamente
                    </p>
                    <p className="text-xs font-bold">Ana Luísa Domingos · 11.ª Classe</p>
                    <p className="text-[11px] font-mono text-white/95 break-all">
                      ana.domingos@{simEduDomain}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-white/10 rounded-xl p-2 text-[10px]">
                    <span>
                      Demo imediata: <strong className="font-mono">{simPreviewDomain}</strong>
                    </span>
                  </div>
                </div>

                {/* Unlocked Licenses */}
                <div className="sm:col-span-5 bg-white rounded-2xl border border-stone-200 p-3.5 space-y-2.5 flex flex-col justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Ecossistema Desbloqueado
                  </p>
                  <ul className="space-y-1.5 text-[11px] text-stone-700">
                    <li className="flex items-center justify-between gap-1">
                      <span>Google Workspace</span>
                      <span className="font-bold text-emerald-700">Grátis</span>
                    </li>
                    <li className="flex items-center justify-between gap-1">
                      <span>Microsoft 365 A1</span>
                      <span className="font-bold text-emerald-700">Grátis</span>
                    </li>
                    <li className="flex items-center justify-between gap-1">
                      <span>Canva Educação</span>
                      <span
                        className={cn(
                          'font-bold',
                          simTutela === 'MED_K12' ? 'text-emerald-700' : 'text-amber-700'
                        )}
                      >
                        {simTutela === 'MED_K12' ? 'Grátis (K-12)' : 'Plano Campus'}
                      </span>
                    </li>
                    <li className="flex items-center justify-between gap-1">
                      <span>GitHub &amp; Figma Edu</span>
                      <span className="font-bold text-emerald-700">Elegível</span>
                    </li>
                    <li className="flex items-center justify-between gap-1">
                      <span>Cartão QR Offline</span>
                      <span className="font-bold text-teal-800">Incluído</span>
                    </li>
                  </ul>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => onOpenDemo(simSchoolName)}
                    className="mt-1 truncate"
                  >
                    Reservar {simEduDomain || `escola.${ROOT_DOMAIN}`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
