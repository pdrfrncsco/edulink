'use client';

import React, { useRef } from 'react';
import { CreditCard, Gift, LayoutGrid, User } from 'lucide-react';
import { cn } from '@/components/ui';
import type { PortalTab } from './types';

interface PortalBottomNavProps {
  activeTab: PortalTab;
  showBenefitsTab: boolean;
  onChangeTab: (tab: PortalTab) => void;
}

/** Mobile-first accessible bottom tab bar with safe-area bottom inset and keyboard arrow navigation. */
export default function PortalBottomNav({
  activeTab,
  showBenefitsTab,
  onChangeTab,
}: PortalBottomNavProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabs: { id: PortalTab; label: string; icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }[] = [
    { id: 'card', label: 'Cartão', icon: CreditCard },
    { id: 'apps', label: 'Apps', icon: LayoutGrid },
    ...(showBenefitsTab ? [{ id: 'benefits' as PortalTab, label: 'Benefícios', icon: Gift }] : []),
    { id: 'account', label: 'Conta', icon: User },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = tabs.length - 1;

    if (nextIdx !== null) {
      e.preventDefault();
      onChangeTab(tabs[nextIdx].id);
      tabRefs.current[nextIdx]?.focus();
    }
  };

  return (
    <nav
      aria-label="Navegação principal do portal"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-stone-200 pb-[env(safe-area-inset-bottom)]"
    >
      <div
        role="tablist"
        aria-label="Secções do Passaporte Académico"
        className={cn(
          'max-w-md mx-auto grid',
          tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'
        )}
      >
        {tabs.map((tab, idx) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              id={`portal-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChangeTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={cn(
                'min-h-[54px] py-2 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold border-t-2 transition',
                active
                  ? 'border-teal-700 text-teal-800 bg-teal-50/40'
                  : 'border-transparent text-stone-500 hover:text-stone-900'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
