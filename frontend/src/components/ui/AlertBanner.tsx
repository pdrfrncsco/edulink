'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from './cn';

export type AlertTone = 'success' | 'warning' | 'info' | 'error';

export interface AlertBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  title?: string;
  action?: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}

const TONE_CLASSES: Record<AlertTone, string> = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  info: 'bg-sky-50 border-sky-200 text-sky-900',
  error: 'bg-red-50 border-red-200 text-red-900',
};

const ICON_MAP: Record<AlertTone, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  error: XCircle,
};

const ICON_COLOR: Record<AlertTone, string> = {
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  info: 'text-sky-700',
  error: 'text-red-700',
};

/** Semantic feedback banner with accessible live/alert role and optional dismiss button. */
export function AlertBanner({
  tone = 'info',
  title,
  action,
  onDismiss,
  dismissLabel = 'Dispensar aviso',
  className,
  children,
  ...props
}: AlertBannerProps) {
  const Icon = ICON_MAP[tone];
  const role = tone === 'error' || tone === 'warning' ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3.5 text-xs sm:text-sm',
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    >
      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', ICON_COLOR[tone])} aria-hidden />
      <div className="flex-1 min-w-0 space-y-1">
        {title && <p className="font-bold leading-snug">{title}</p>}
        <div className="font-medium leading-relaxed">{children}</div>
        {action && <div className="pt-1.5">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="rounded-lg p-1 text-current/70 hover:text-current hover:bg-black/5 shrink-0"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
