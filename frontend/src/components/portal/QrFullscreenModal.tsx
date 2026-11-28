'use client';

import React from 'react';
import { Button, Modal } from '@/components/ui';
import type { PassportData } from './types';

interface QrFullscreenModalProps {
  open: boolean;
  passport: PassportData | null;
  qrDataUrl: string;
  onClose: () => void;
}

/** High-contrast modal displaying the enlarged verifiable JWT QR Code for scanners. */
export default function QrFullscreenModal({
  open,
  passport,
  qrDataUrl,
  onClose,
}: QrFullscreenModalProps) {
  return (
    <Modal
      open={Boolean(open && passport && qrDataUrl)}
      onClose={onClose}
      eyebrow={passport?.schoolName}
      title={passport?.fullName || 'QR Code do Passaporte Académico'}
      description={passport ? `BI / Processo: ${passport.biNumber}` : undefined}
      size="sm"
    >
      {passport && qrDataUrl && (
        <div className="text-center space-y-4">
          <img
            src={qrDataUrl}
            alt={`QR Code ampliado de ${passport.fullName}`}
            className="w-60 h-60 mx-auto rounded-xl border border-stone-200 p-2 bg-white"
          />
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Fechar
          </Button>
        </div>
      )}
    </Modal>
  );
}
