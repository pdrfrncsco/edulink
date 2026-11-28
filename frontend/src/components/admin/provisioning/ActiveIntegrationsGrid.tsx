'use client';

import React from 'react';
import { AlertBanner, Button, Card, StatusBadge } from '@/components/ui';
import { formatDateTimeAO } from '@/lib/formatters';
import type { CloudIntegration } from '../types';

interface ActiveIntegrationsGridProps {
  integrations: CloudIntegration[];
  loading: boolean;
  onTestConnection: (id: string) => void;
}

/** Configured Google Workspace and Microsoft 365 cloud integration status cards. */
export default function ActiveIntegrationsGrid({
  integrations,
  loading,
  onTestConnection,
}: ActiveIntegrationsGridProps) {
  if (integrations.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {integrations.map((intg) => (
        <Card key={intg.id} variant="muted" padding="sm" className="rounded-xl space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-sm text-stone-900">
              {intg.provider === 'GOOGLE'
                ? 'Google Workspace for Education'
                : 'Microsoft 365 (Entra ID)'}
            </span>
            <StatusBadge
              tone={
                intg.sync_status === 'SUCCESS'
                  ? 'success'
                  : intg.sync_status === 'ERROR'
                  ? 'error'
                  : 'warning'
              }
              dot
            >
              {intg.sync_status}
            </StatusBadge>
          </div>
          {intg.last_error_message && (
            <AlertBanner tone="error">{intg.last_error_message}</AlertBanner>
          )}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-stone-500">
              {intg.last_sync_at
                ? `Última sync: ${formatDateTimeAO(intg.last_sync_at)}`
                : 'Nunca sincronizado'}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => onTestConnection(intg.id)}
            >
              Testar Ligação
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
