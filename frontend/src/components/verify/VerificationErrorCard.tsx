'use client';

import React from 'react';
import { XCircle } from 'lucide-react';
import { AlertBanner, Button } from '@/components/ui';

interface VerificationErrorCardProps {
  networkError?: boolean;
  error?: string;
  onRetry: () => void;
}

/** Displays invalid/revoked credential rejection or network retry guidance on `/verify`. */
export default function VerificationErrorCard({
  networkError,
  error,
  onRetry,
}: VerificationErrorCardProps) {
  return (
    <div className="space-y-4">
      <AlertBanner
        tone="error"
        title={networkError ? 'Erro de Ligação ao Servidor' : 'Validação Não Aprovada'}
      >
        <div className="flex items-start gap-2">
          <XCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error || 'Cartão digital não reconhecido.'}</span>
        </div>
      </AlertBanner>
      {networkError ? (
        <Button type="button" size="lg" fullWidth onClick={onRetry}>
          Tentar Novamente
        </Button>
      ) : (
        <p className="text-xs text-stone-500 text-center">
          Se é estudante ou professor, dirija-se à secretaria da sua instituição de ensino para
          regularizar a sua situação.
        </p>
      )}
    </div>
  );
}
