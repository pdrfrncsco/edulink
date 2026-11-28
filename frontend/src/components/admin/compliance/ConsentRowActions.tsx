'use client';

import React from 'react';
import { Button, Input } from '@/components/ui';
import type { ParentalConsent } from '../types';

interface ConsentRowActionsProps {
  consent: ParentalConsent;
  loading: boolean;
  isPromptOpen: boolean;
  guardianEmailInput: string;
  onOpenHtml: (consent: ParentalConsent) => void;
  onSendEmail: (consentId: string, overrideEmail?: string) => void;
  onToggleEmailPrompt: (consentId: string) => void;
  onChangeEmailInput: (value: string) => void;
  onRequestRevoke: (consent: ParentalConsent) => void;
}

/** Row-level HTML preview, guardian email dispatch, and revocation controls for parental consents. */
export default function ConsentRowActions({
  consent,
  loading,
  isPromptOpen,
  guardianEmailInput,
  onOpenHtml,
  onSendEmail,
  onToggleEmailPrompt,
  onChangeEmailInput,
  onRequestRevoke,
}: ConsentRowActionsProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={() => onOpenHtml(consent)}>
          HTML
        </Button>
        {consent.status === 'PENDING' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() =>
              consent.guardian_email
                ? onSendEmail(consent.id)
                : onToggleEmailPrompt(consent.id)
            }
          >
            Enviar E-mail
          </Button>
        )}
        {consent.status !== 'REVOKED' && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => onRequestRevoke(consent)}
          >
            Revogar
          </Button>
        )}
      </div>

      {isPromptOpen && (
        <div className="flex flex-wrap gap-1.5 items-center pt-1">
          <label htmlFor={`guardian-email-${consent.id}`} className="sr-only">
            E-mail do Encarregado
          </label>
          <Input
            id={`guardian-email-${consent.id}`}
            type="email"
            placeholder="encarregado@email.ao"
            value={guardianEmailInput}
            onChange={(e) => onChangeEmailInput(e.target.value)}
            className="w-auto min-w-[180px] py-1 text-xs"
          />
          <Button
            type="button"
            size="sm"
            disabled={loading || !guardianEmailInput.trim()}
            onClick={() => onSendEmail(consent.id, guardianEmailInput)}
          >
            Enviar
          </Button>
        </div>
      )}
    </div>
  );
}
