'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { StatusBadge, cn } from '@/components/ui';
import { ONBOARDING_STEPS, ROOT_DOMAIN } from './types';

interface OnboardingStepperProps {
  step: number;
  effectiveSlug: string;
  onSelectStep: (stepId: number) => void;
}

/** 4-step institutional onboarding header and accessible progress navigation. */
export default function OnboardingStepper({
  step,
  effectiveSlug,
  onSelectStep,
}: OnboardingStepperProps) {
  return (
    <div className="border-b border-stone-100 pb-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="onboarding-wizard-heading" className="text-lg font-bold text-stone-900">
            Onboarding Institucional &amp; Gerador de Site
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Recolha os dados legais, publique imediatamente em{' '}
            <span className="font-mono text-teal-800">
              {effectiveSlug}.{ROOT_DOMAIN}
            </span>{' '}
            e prepare o dossiê DNS.AO, Google, Microsoft e APD.
          </p>
        </div>
        <StatusBadge tone="brand" size="md">
          Passo {step} de {ONBOARDING_STEPS.length}
        </StatusBadge>
      </div>

      <nav aria-label="Etapas do cadastro institucional">
        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {ONBOARDING_STEPS.map((item) => {
            const isCurrent = step === item.id;
            const isDone = step > item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectStep(item.id)}
                  disabled={item.id > step}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl border text-xs transition',
                    isCurrent
                      ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-bold'
                      : isDone
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900 font-semibold hover:bg-emerald-50'
                      : 'border-stone-200 bg-stone-50 text-stone-400 cursor-not-allowed'
                  )}
                >
                  <span className="block text-[10px] uppercase tracking-wider opacity-80">
                    {isDone ? (
                      <span className="inline-flex items-center gap-1">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        Concluído
                      </span>
                    ) : (
                      `Etapa ${item.id}`
                    )}
                  </span>
                  <span className="truncate block">{item.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
