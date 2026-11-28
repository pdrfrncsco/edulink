'use client';

import React from 'react';
import { Card, CopyButton } from '@/components/ui';

interface DnsAoDossierCardProps {
  nameservers: string[];
  requiredDocuments?: string[];
}

/** Displays delegated Cloudflare nameservers and DNS.AO registrar requirements checklist. */
export default function DnsAoDossierCard({
  nameservers,
  requiredDocuments,
}: DnsAoDossierCardProps) {
  if (nameservers.length === 0 && !requiredDocuments?.length) return null;

  return (
    <Card variant="muted" padding="sm" className="rounded-xl space-y-2 text-xs">
      <span className="font-bold text-stone-900 uppercase block">
        Nameservers para Delegação no Registrar DNS.AO:
      </span>
      <div className="flex flex-wrap gap-2">
        {nameservers.map((ns) => (
          <div
            key={ns}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-stone-300"
          >
            <code className="font-mono text-teal-800">{ns}</code>
            <CopyButton value={ns} label="Copiar" size="sm" />
          </div>
        ))}
      </div>
      {requiredDocuments && (
        <ul className="list-disc list-inside text-stone-600 pt-1">
          {requiredDocuments.map((doc, idx) => (
            <li key={idx}>{doc}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
