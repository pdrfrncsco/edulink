'use client';

import React from 'react';
import { cn } from './cn';

export type StatusTone = 'success' | 'warning' | 'info' | 'error' | 'brand' | 'neutral';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  size?: 'sm' | 'md';
  dot?: boolean;
  mono?: boolean;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  brand: 'bg-teal-50 text-teal-800 border-teal-200',
  neutral: 'bg-stone-100 text-stone-700 border-stone-200',
};

const DOT_CLASSES: Record<StatusTone, string> = {
  success: 'bg-emerald-600',
  warning: 'bg-amber-500',
  info: 'bg-sky-600',
  error: 'bg-red-600',
  brand: 'bg-teal-700',
  neutral: 'bg-stone-500',
};

/** Semantic pill badge adhering to EduLink Design System status tokens. */
export function StatusBadge({
  tone = 'neutral',
  size = 'sm',
  dot = false,
  mono = false,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        TONE_CLASSES[tone],
        mono && 'font-mono',
        className
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', DOT_CLASSES[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}
