'use client';

import React from 'react';
import { ExternalLink, Lock, WifiOff } from 'lucide-react';
import { Card, StatusBadge } from '@/components/ui';
import type { CloudAppItem } from '../types';

interface CloudAppListProps {
  title: string;
  apps: CloudAppItem[];
  isSuspended: boolean;
  isOffline: boolean;
  isDemoDomain: boolean;
}

/** Mobile-first 360px-safe list of school cloud apps with offline, suspension, and Canva eligibility guards. */
export default function CloudAppList({
  title,
  apps,
  isSuspended,
  isOffline,
  isDemoDomain,
}: CloudAppListProps) {
  return (
    <Card padding="sm" className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">{title}</h2>
      <div className="space-y-2.5">
        {apps.map((app) => {
          const blockedByDemo = isDemoDomain;
          const isLocked = isSuspended || isOffline || !app.available || blockedByDemo;

          const statusTone = isSuspended
            ? 'error'
            : isOffline
            ? 'warning'
            : !app.available || blockedByDemo
            ? 'neutral'
            : 'brand';

          const statusLabel = isSuspended
            ? 'Suspenso'
            : isOffline
            ? 'Requer internet'
            : blockedByDemo && app.available
            ? 'Requer .edu.ao'
            : app.badge;

          if (isLocked) {
            return (
              <div
                key={app.name}
                aria-disabled="true"
                className="min-h-[56px] rounded-xl border border-stone-200 bg-stone-50 p-3.5 opacity-80 space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-900 inline-flex items-center gap-1.5 min-w-0">
                    {isOffline ? (
                      <WifiOff className="h-3.5 w-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-stone-500 shrink-0" aria-hidden="true" />
                    )}
                    <span className="break-words">{app.name}</span>
                  </span>
                  <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed break-words">
                  {app.subtitle}
                </p>
              </div>
            );
          }

          return (
            <a
              key={app.name}
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block min-h-[56px] rounded-xl border border-stone-200 bg-white p-3.5 transition hover:border-teal-500 hover:bg-teal-50/30 space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-900 inline-flex items-center gap-1.5 min-w-0">
                  <span className="break-words">{app.name}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-stone-400 shrink-0" aria-hidden="true" />
                </span>
                <StatusBadge tone="brand">{app.badge}</StatusBadge>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed break-words">
                {app.subtitle}
              </p>
            </a>
          );
        })}
      </div>
    </Card>
  );
}
