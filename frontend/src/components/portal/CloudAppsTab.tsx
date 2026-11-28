'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { AlertBanner, Card, CopyButton, StatusBadge, cn } from '@/components/ui';
import type { CloudAppItem, GlobalPerkItem, PassportData } from './types';

interface CloudAppsTabProps {
  passport: PassportData;
  isSuspended: boolean;
  cloudApps: CloudAppItem[];
  globalPerks: GlobalPerkItem[];
}

/** Institutional email, SSO cloud apps (Google, Microsoft, Canva), and global student perks. */
export default function CloudAppsTab({
  passport,
  isSuspended,
  cloudApps,
  globalPerks,
}: CloudAppsTabProps) {
  const domainSuffix = passport.schoolDomain.split('.').slice(-2).join('.');

  return (
    <div className="space-y-4">
      <Card padding="sm" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-stone-900">O Seu E-mail Institucional</h2>
            <p className="text-xs font-mono text-teal-800 break-all">
              {passport.institutionalEmail}
            </p>
          </div>
          <CopyButton
            value={passport.institutionalEmail}
            label="Copiar"
            copiedLabel="Copiado!"
            size="sm"
            className="shrink-0"
          />
        </div>
        {isSuspended && (
          <AlertBanner tone="error">
            A sua matrícula está suspensa. Contacte a secretaria de {passport.schoolName} para
            reativar os acessos em nuvem.
          </AlertBanner>
        )}
      </Card>

      <Card padding="sm" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
          Ferramentas da Escola (Login Único)
        </h2>
        <div className="space-y-2.5">
          {cloudApps.map((app) =>
            isSuspended ? (
              <div
                key={app.name}
                aria-disabled="true"
                className="block rounded-xl border border-stone-200 bg-stone-50 p-3.5 opacity-60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-900">{app.name}</span>
                  <StatusBadge tone="neutral">{app.badge}</StatusBadge>
                </div>
                <p className="text-[11px] text-stone-600 mt-1">{app.subtitle}</p>
              </div>
            ) : (
              <a
                key={app.name}
                href={app.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-stone-200 p-3.5 transition hover:border-teal-500 hover:bg-teal-50/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-900 inline-flex items-center gap-1">
                    {app.name}
                    <ExternalLink className="h-3 w-3 text-stone-400" aria-hidden="true" />
                  </span>
                  <StatusBadge tone={app.available ? 'brand' : 'neutral'}>{app.badge}</StatusBadge>
                </div>
                <p className="text-[11px] text-stone-600 mt-1">{app.subtitle}</p>
              </a>
            )
          )}
        </div>
      </Card>

      <Card padding="sm" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
          Benefícios Globais com o Domínio .{domainSuffix}
        </h2>
        <ul className="space-y-2">
          {globalPerks.map((perk) => (
            <li
              key={perk.name}
              className="rounded-xl border border-stone-200 p-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-900">{perk.name}</p>
                <p className="text-[11px] text-stone-600">{perk.desc}</p>
              </div>
              <a
                href={perk.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'shrink-0 min-h-[36px] inline-flex items-center rounded-lg border border-teal-700 px-3 py-1.5 text-[11px] font-semibold text-teal-800 hover:bg-teal-50'
                )}
              >
                Ativar
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
