'use client';

import React, { useMemo, useState } from 'react';
import { Button, cn } from '@/components/ui';
import { formatKz } from '@/lib/formatters';
import type { TutelaType } from './data';

interface RoiCalculatorProps {
  onOpenDemo: (prefillSchool?: string) => void;
}

/** Interactive Kwanza ROI / "Custo Zero" calculator with accessible range sliders. */
export default function RoiCalculator({ onOpenDemo }: RoiCalculatorProps) {
  const [calcStudents, setCalcStudents] = useState(450);
  const [calcTutela, setCalcTutela] = useState<TutelaType>('MED_K12');
  const [cardFeeAoa, setCardFeeAoa] = useState(1500);

  const roiMetrics = useMemo(() => {
    let planName = 'EduLink Essencial';
    let annualPrice = 240000;
    if (calcTutela === 'MESCTI_HIGHER_ED' || calcStudents > 1500) {
      planName = 'EduLink Campus';
      annualPrice = 1200000;
    } else if (calcStudents > 400) {
      planName = 'EduLink Pro';
      annualPrice = 480000;
    }

    const costPerStudentYear = annualPrice / Math.max(calcStudents, 1);
    const totalCardRevenue = calcStudents * cardFeeAoa;
    const netSurplus = totalCardRevenue - annualPrice;
    const agencySavingsMin = 500000;

    return {
      planName,
      annualPrice,
      costPerStudentYear,
      totalCardRevenue,
      netSurplus,
      agencySavingsMin,
    };
  }, [calcStudents, calcTutela, cardFeeAoa]);

  return (
    <section id="calculadora" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Simulador Financeiro em Kwanzas (AOA)
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Como transformar a EduLink em investimento de “Custo Zero”
            </h2>
            <p className="text-sm text-stone-600">
              Ao incluir o Passaporte Digital e o e-mail institucional na taxa de matrícula ou emissão
              do cartão escolar, a escola paga a subscrição anual sem retirar liquidez do caixa.
            </p>
          </div>

          <div className="space-y-5 bg-stone-50 rounded-2xl p-5 border border-stone-200">
            <div>
              <div className="flex justify-between text-xs font-bold text-stone-800 mb-1.5">
                <label htmlFor="calc-students">Número de Estudantes Ativos</label>
                <span className="font-mono text-teal-800">
                  {calcStudents.toLocaleString('pt-AO')} alunos
                </span>
              </div>
              <input
                id="calc-students"
                type="range"
                min={100}
                max={3000}
                step={50}
                value={calcStudents}
                aria-valuetext={`${calcStudents.toLocaleString('pt-AO')} alunos`}
                onChange={(e) => setCalcStudents(Number(e.target.value))}
                className="edulink-range w-full cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-500 mt-1">
                <span>100</span>
                <span>500</span>
                <span>1.500</span>
                <span>3.000</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-stone-800 mb-1.5">
                <label htmlFor="calc-card-fee">
                  Taxa anual de Cartão Digital / Matrícula (opcional)
                </label>
                <span className="font-mono text-teal-800">{formatKz(cardFeeAoa)} / aluno</span>
              </div>
              <input
                id="calc-card-fee"
                type="range"
                min={0}
                max={3500}
                step={250}
                value={cardFeeAoa}
                aria-valuetext={`${formatKz(cardFeeAoa)} por aluno`}
                onChange={(e) => setCardFeeAoa(Number(e.target.value))}
                className="edulink-range w-full cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-500 mt-1">
                <span>0 Kz (absorvido pela escola)</span>
                <span>1.500 Kz</span>
                <span>3.500 Kz</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-xs font-bold text-stone-700">Tipo de Instituição:</span>
              <div
                role="group"
                aria-label="Tipo de instituição para cálculo do plano"
                className="inline-flex rounded-xl bg-white border border-stone-200 p-1 text-xs font-semibold"
              >
                <button
                  type="button"
                  aria-pressed={calcTutela === 'MED_K12'}
                  onClick={() => setCalcTutela('MED_K12')}
                  className={cn(
                    'min-h-[36px] px-3 py-1 rounded-lg transition',
                    calcTutela === 'MED_K12' ? 'bg-teal-700 text-white' : 'text-stone-600'
                  )}
                >
                  Colégio / Instituto (MED)
                </button>
                <button
                  type="button"
                  aria-pressed={calcTutela === 'MESCTI_HIGHER_ED'}
                  onClick={() => setCalcTutela('MESCTI_HIGHER_ED')}
                  className={cn(
                    'min-h-[36px] px-3 py-1 rounded-lg transition',
                    calcTutela === 'MESCTI_HIGHER_ED' ? 'bg-teal-700 text-white' : 'text-stone-600'
                  )}
                >
                  Universidade / IES
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-3xl bg-stone-900 text-white p-6 sm:p-8 space-y-5 shadow-lg">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-teal-300 font-bold block">
                  Plano Recomendado
                </span>
                <p className="text-xl font-extrabold">{roiMetrics.planName}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-teal-300">
                  {formatKz(roiMetrics.annualPrice)}
                </p>
                <span className="text-[11px] text-stone-400">por ano letivo</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <span className="text-stone-300 block">Custo diluído por aluno/ano</span>
                <p className="text-lg font-extrabold text-white mt-1">
                  {formatKz(roiMetrics.costPerStudentYear)}
                </p>
                <span className="text-[10px] text-teal-300">
                  ≈ {formatKz(roiMetrics.costPerStudentYear / 12)} / mês
                </span>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <span className="text-stone-300 block">Poupança face a agência web</span>
                <p className="text-lg font-extrabold text-emerald-300 mt-1">
                  +{formatKz(roiMetrics.agencySavingsMin)}
                </p>
                <span className="text-[10px] text-stone-300">Site + SSL + DNS incluídos</span>
              </div>
            </div>

            <div className="rounded-2xl bg-teal-950/80 border border-teal-700/60 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-teal-200">Arrecadação anual do Cartão Digital:</span>
                <span className="font-mono font-bold text-white">
                  {formatKz(roiMetrics.totalCardRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-1 border-t border-teal-800/70">
                <span className="font-bold text-white">
                  {roiMetrics.netSurplus >= 0
                    ? 'Saldo Líquido Positivo para a Escola:'
                    : 'Investimento Líquido Anual:'}
                </span>
                <span
                  className={cn(
                    'font-mono font-extrabold',
                    roiMetrics.netSurplus >= 0 ? 'text-emerald-300' : 'text-amber-300'
                  )}
                >
                  {roiMetrics.netSurplus >= 0 ? '+' : ''}
                  {formatKz(Math.abs(roiMetrics.netSurplus))}
                </span>
              </div>
            </div>

            <Button
              type="button"
              size="lg"
              fullWidth
              onClick={() => onOpenDemo()}
              className="bg-teal-500 text-stone-950 hover:bg-teal-400 font-extrabold"
            >
              Pedir Proposta Personalizada para {calcStudents.toLocaleString('pt-AO')} Alunos
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
