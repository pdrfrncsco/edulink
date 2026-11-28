'use client';

import React from 'react';
import { cn } from './cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'line' | 'circle' | 'block';
}

/** Accessible subtle loading placeholder respecting reduced motion. */
export function Skeleton({ variant = 'line', className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-stone-200/80 motion-reduce:animate-none',
        variant === 'circle' && 'rounded-full',
        variant === 'line' && 'h-3.5 rounded-md',
        variant === 'block' && 'rounded-2xl',
        className
      )}
      {...props}
    />
  );
}

/** Clean skeleton placeholder matching EduLink Card surfaces during initial auth/data load. */
export function SkeletonCard({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="A carregar conteúdo"
      className={cn(
        'rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm space-y-3',
        className
      )}
    >
      <span className="sr-only">A carregar dados...</span>
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: rows }).map((_, idx) => (
        <Skeleton key={idx} className={cn('h-3', idx === rows - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
