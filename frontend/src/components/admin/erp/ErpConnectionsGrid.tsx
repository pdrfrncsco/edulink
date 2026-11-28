'use client';

import React from 'react';
import { Button, Card, CopyButton, StatusBadge } from '@/components/ui';
import type { ERPConnection } from '../types';

interface ErpConnectionsGridProps {
  connections: ERPConnection[];
  revealedSecrets: Record<string, string>;
  loading: boolean;
  onRevealSecret: (connId: string) => void;
  onSimulateEvent: (conn: ERPConnection) => void;
}

/** Active local ERP webhook connectors with endpoint copy, HMAC secret reveal, and sandbox trigger. */
export default function ErpConnectionsGrid({
  connections,
  revealedSecrets,
  loading,
  onRevealSecret,
  onSimulateEvent,
}: ErpConnectionsGridProps) {
  if (connections.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {connections.map((conn) => (
        <Card key={conn.id} variant="muted" padding="sm" className="rounded-xl space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm text-stone-900">{conn.provider}</span>
            <StatusBadge tone="brand" dot>
              {conn.last_sync_status}
            </StatusBadge>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-stone-500">
                Endpoint Webhook (Header: X-EduLink-Signature):
              </span>
              <CopyButton value={conn.webhook_path} label="Copiar" size="sm" />
            </div>
            <code className="block font-mono bg-white p-2 rounded border border-stone-200 break-all text-teal-800 mt-1">
              {conn.webhook_path}
            </code>
          </div>
          {revealedSecrets[conn.id] && (
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-stone-500">Chave secreta de assinatura:</span>
                <CopyButton value={revealedSecrets[conn.id]} label="Copiar" size="sm" />
              </div>
              <code className="block font-mono bg-amber-50 p-2 rounded border border-amber-200 break-all text-amber-900 mt-1">
                {revealedSecrets[conn.id]}
              </code>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRevealSecret(conn.id)}
            >
              Ver Chave Secreta
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => onSimulateEvent(conn)}
            >
              Simular Matrícula
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
