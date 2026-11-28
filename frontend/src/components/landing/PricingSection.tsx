'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { Button, ButtonLink, StatusBadge, cn } from '@/components/ui';
import { formatKz } from '@/lib/formatters';
import { ADMIN_URL, PLANS } from './data';

interface PricingSectionProps {
  onOpenDemo: (prefillSchool?: string) => void;
}

/** Commercial pricing tiers in Angolan Kwanzas (AOA). */
export default function PricingSection({ onOpenDemo }: PricingSectionProps) {
  return (
    <section id="planos" className="bg-white border-y border-stone-200 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Preços Transparentes em Kwanzas (AOA)
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Planos desenhados para o ciclo letivo das escolas em Angola
            </h2>
          </div>
          <StatusBadge tone="warning" size="md" className="rounded-2xl px-4 py-2.5 whitespace-normal">
            Condições especiais para os 10 primeiros colégios piloto em Luanda
          </StatusBadge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => (
            <div
              key={plan.code}
              className={cn(
                'rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 border transition',
                plan.featured
                  ? 'border-teal-600 bg-teal-50/40 shadow-lg ring-1 ring-teal-600/20'
                  : 'border-stone-200 bg-white shadow-sm'
              )}
            >
              <div className="space-y-4">
                <span
                  className={cn(
                    'inline-block rounded-full px-3 py-1 text-[11px] font-bold',
                    plan.featured ? 'bg-teal-700 text-white' : 'bg-stone-100 text-stone-700'
                  )}
                >
                  {plan.badge}
                </span>

                <div>
                  <h3 className="text-xl font-bold text-stone-900">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-stone-900">
                      {formatKz(plan.price)}
                    </span>
                    <span className="text-xs font-semibold text-stone-500">{plan.period}</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">{plan.setupNote}</p>
                </div>

                <ul className="space-y-2.5 pt-3 border-t border-stone-200/80 text-xs text-stone-700">
                  {plan.features.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <ButtonLink
                  href={ADMIN_URL}
                  variant={plan.featured ? 'primary' : 'secondary'}
                  size="lg"
                  fullWidth
                  className="text-xs font-bold"
                >
                  Começar com {plan.name}
                </ButtonLink>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => onOpenDemo()}
                >
                  Falar com Especialista
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
