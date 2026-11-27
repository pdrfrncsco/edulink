'use client';

import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from './cn';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

/** Standardized empty state placeholder for tables, lists, and panels. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/70',
        compact ? 'px-4 py-6 gap-2' : 'px-6 py-10 gap-3',
        className
      )}
      {...props}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-stone-200 text-stone-500 shadow-sm">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden="true" />}
      </div>
      <div className="space-y-1 max-w-md">
        <p className="text-sm font-bold text-stone-800">{title}</p>
        {description && <p className="text-xs text-stone-500 leading-relaxed">{description}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
