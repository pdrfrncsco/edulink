'use client';

import React, { useRef } from 'react';
import { cn } from './cn';

export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  items: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  idPrefix?: string;
  variant?: 'underline' | 'pills';
  className?: string;
}

/**
 * Accessible horizontal single-row tablist supporting ArrowLeft/ArrowRight/Home/End
 * keyboard navigation and WCAG 1.4.1 non-color selection indicators.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  idPrefix = 'edulink-tab',
  variant = 'underline',
  className,
}: TabsProps<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (items.length === 0) return;
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % items.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + items.length) % items.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = items.length - 1;

    if (nextIdx !== null) {
      e.preventDefault();
      const target = items[nextIdx];
      onChange(target.id);
      const el = tabRefs.current[nextIdx];
      el?.focus();
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'edulink-tablist',
        variant === 'pills'
          ? 'inline-flex max-w-full rounded-xl bg-stone-100 p-1 gap-1 border border-stone-200/80'
          : 'border-b border-stone-200 gap-1',
        className
      )}
    >
      {items.map((item, idx) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            id={`${idPrefix}-${item.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={(e) => {
              onChange(item.id);
              e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              'inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-semibold transition whitespace-nowrap flex-none snap-start',
              variant === 'pills'
                ? selected
                  ? 'rounded-lg bg-white text-teal-900 border border-stone-300/80 shadow-sm'
                  : 'rounded-lg border border-transparent text-stone-600 hover:text-stone-900'
                : cn('edulink-tab', selected ? 'text-teal-800' : 'text-stone-600 hover:text-stone-900')
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  selected ? 'bg-teal-50 text-teal-800' : 'bg-stone-200/80 text-stone-700'
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  idPrefix?: string;
  tabId: string;
  active: boolean;
}

/** Associated ARIA tabpanel wrapper with `aria-labelledby` matching `Tabs`. */
export function TabPanel({
  idPrefix = 'edulink-tab',
  tabId,
  active,
  children,
  className,
  ...props
}: TabPanelProps) {
  if (!active) return null;
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${tabId}`}
      aria-labelledby={`${idPrefix}-${tabId}`}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}
