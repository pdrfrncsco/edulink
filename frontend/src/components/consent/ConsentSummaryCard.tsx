'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { AlertBanner, ButtonLink, Card, StatusBadge } from '@/components/ui';
import { API_BASE, type ParentalConsent } from '@/components/admin/types';

interface ConsentSummaryCardProps {
  consent: ParentalConsent;
}

/** Displays student metadata, current APD consent status, and signed/revoked actions. */
export default function ConsentSummaryCard({ consent }: ConsentSummaryCardProps) {
  return (
    <>
      <Card variant="muted" padding="sm" className="rounded-xl text-xs space-y-1">
        <p>
          <strong>Instituição:</strong> {consent.school_name}
        </p>
        <p>
          <strong>Estudante:</strong> {consent.student_name}
        </p>
        <p>
          <strong>E-mail Institucional:</strong>{' '}
          <span className="font-mono text-teal-800">{consent.student_email}</span>
        </p>
        <div className="pt-0.5 flex items-center gap-2">
          <strong>Estado Atual:</strong>
          <StatusBadge
            tone={
              consent.status === 'SIGNED'
                ? 'success'
                : consent.status === 'REVOKED'
                ? 'error'
                : 'warning'
            }
            dot
          >
            {consent.status === 'SIGNED'
              ? 'Assinado'
              : consent.status === 'REVOKED'
              ? 'Revogado'
              : 'Pendente'}
          </StatusBadge>
        </div>
      </Card>

      {consent.status === 'REVOKED' && (
        <AlertBanner tone="error" title="Consentimento Revogado">
          Este termo foi revogado junto da secretaria da escola. Contacte a direção caso pretenda
          emitir um novo termo de autorização.
        </AlertBanner>
      )}

      {consent.status === 'SIGNED' && (
        <div className="space-y-3 text-xs text-stone-700">
          <p>
            Assinado por <strong>{consent.guardian_full_name}</strong> (BI:{' '}
            <span className="font-mono">{consent.guardian_bi}</span>).
          </p>
          <ButtonLink
            href={`${API_BASE}/compliance/consents/download-by-token/?token=${encodeURIComponent(
              consent.consent_token
            )}`}
            target="_blank"
            rel="noreferrer"
            size="lg"
            className="text-xs"
            rightIcon={<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Descarregar Comprovativo (HTML / Imprimir)
          </ButtonLink>
        </div>
      )}
    </>
  );
}
