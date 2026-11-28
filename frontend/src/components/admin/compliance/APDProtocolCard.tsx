'use client';

import React from 'react';
import { Button, FormField, Input } from '@/components/ui';

interface APDProtocolCardProps {
  apdRefNumber: string;
  loading: boolean;
  onChangeRefNumber: (value: string) => void;
  onConfirmSubmitted: () => void;
}

/** Registers the official APD protocol submission number for an existing compliance dossier. */
export default function APDProtocolCard({
  apdRefNumber,
  loading,
  onChangeRefNumber,
  onConfirmSubmitted,
}: APDProtocolCardProps) {
  return (
    <div className="border-t border-stone-100 pt-4 flex flex-col sm:flex-row gap-3 items-end">
      <FormField
        id="apd-ref-number"
        label="Registar N.º de Processo Protocolado na APD"
        className="flex-1 w-full"
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="apd_reference_number"
            type="text"
            mono
            invalid={invalid}
            aria-describedby={describedBy}
            placeholder="Ex: APD-PROC-2026-0412"
            value={apdRefNumber}
            onChange={(e) => onChangeRefNumber(e.target.value)}
          />
        )}
      </FormField>
      <Button type="button" variant="secondary" disabled={loading} onClick={onConfirmSubmitted}>
        Confirmar Submissão à APD
      </Button>
    </div>
  );
}
