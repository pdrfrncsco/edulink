'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { ButtonLink, Card, StatusBadge } from '@/components/ui';
import type { GlobalPerkItem } from '../types';

interface GlobalPerksListProps {
  title: string;
  domainSuffix: string;
  perks: GlobalPerkItem[];
  isSuspended: boolean;
  isOffline: boolean;
  isDemoDomain: boolean;
}

/** Displays MED/MESCTI and Student/Teacher specific global developer/academic benefits safely at 360px. */
export default function GlobalPerksList({
  title,
  domainSuffix,
  perks,
  isSuspended,
  isOffline,
  isDemoDomain,
}: GlobalPerksListProps) {
  const locked = isSuspended || isOffline || isDemoDomain;
  const lockedLabel = isSuspended
    ? 'Suspenso'
    : isOffline
    ? 'Requer internet'
    : 'Aguardando .edu.ao';

  return (
    <Card padding="sm" className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">{title}</h2>
        {!isDemoDomain && (
          <p className="text-[11px] text-stone-500">
            Elegibilidade associada ao domínio <span className="font-mono">.{domainSuffix}</span>
          </p>
        )}
      </div>

      <ul className="space-y-2.5">
        {perks.map((perk) => (
          <li
            key={perk.name}
            className="rounded-xl border border-stone-200 p-3.5 flex flex-col gap-2.5"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-stone-900 break-words">{perk.name}</p>
                {perk.badge && <StatusBadge tone="neutral">{perk.badge}</StatusBadge>}
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">{perk.desc}</p>
            </div>

            {locked ? (
              <div className="flex justify-start">
                <StatusBadge tone={isOffline ? 'warning' : 'neutral'}>{lockedLabel}</StatusBadge>
              </div>
            ) : (
              <ButtonLink
                href={perk.href}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                size="lg"
                fullWidth
                className="text-xs border-teal-700 text-teal-800 hover:bg-teal-50"
                rightIcon={<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Abrir Programa Académico
              </ButtonLink>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
