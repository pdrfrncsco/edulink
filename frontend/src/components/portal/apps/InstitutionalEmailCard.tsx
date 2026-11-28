'use client';

import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { AlertBanner, Button, Card, CopyButton, StatusBadge } from '@/components/ui';
import type { PersonaContextMeta } from '../cloudAppsCatalog';

interface InstitutionalEmailCardProps {
  institutionalEmail: string;
  schoolName: string;
  personaMeta: PersonaContextMeta;
  isSuspended: boolean;
  isOffline: boolean;
  isTokenExpired: boolean;
  isDemoDomain: boolean;
  onSync?: () => void;
}

/** Displays institutional identity e-mail, MED/MESCTI role badge, and offline/suspension safety alerts. */
export default function InstitutionalEmailCard({
  institutionalEmail,
  schoolName,
  personaMeta,
  isSuspended,
  isOffline,
  isTokenExpired,
  isDemoDomain,
  onSync,
}: InstitutionalEmailCardProps) {
  return (
    <Card padding="sm" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
        <StatusBadge tone="brand">{personaMeta.personaLabel}</StatusBadge>
        <StatusBadge tone={isOffline ? 'warning' : 'neutral'}>
          {isOffline ? (
            <span className="inline-flex items-center gap-1">
              <WifiOff className="h-3 w-3 shrink-0" aria-hidden="true" />
              Modo offline
            </span>
          ) : (
            personaMeta.tutelaBadge
          )}
        </StatusBadge>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-stone-900">O Seu E-mail Institucional</h2>
          <p className="text-xs text-stone-500 mt-0.5 leading-snug">{personaMeta.summary}</p>
          <p className="text-xs sm:text-sm font-mono text-teal-800 break-all mt-1.5 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
            {institutionalEmail}
          </p>
        </div>

        <CopyButton
          value={institutionalEmail}
          label="Copiar E-mail"
          copiedLabel="E-mail Copiado!"
          size="lg"
          className="w-full"
        />
      </div>

      {isSuspended && (
        <AlertBanner tone="error">
          A sua matrícula está suspensa. Contacte a secretaria de {schoolName} para reativar os
          acessos às ferramentas em nuvem.
        </AlertBanner>
      )}

      {!isSuspended && isOffline && (
        <AlertBanner
          tone="warning"
          action={
            onSync && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSync}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Verificar ligação
              </Button>
            )
          }
        >
          Está sem ligação à internet. O seu e-mail institucional e o Cartão Digital continuam
          acessíveis neste telemóvel, mas as aplicações na nuvem exigem Wi-Fi ou dados móveis.
        </AlertBanner>
      )}

      {!isSuspended && !isOffline && isTokenExpired && (
        <AlertBanner
          tone="warning"
          action={
            onSync && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSync}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Atualizar sessão
              </Button>
            )
          }
        >
          A credencial guardada expirou. Atualize a sessão antes de aceder às plataformas externas.
        </AlertBanner>
      )}

      {!isSuspended && !isOffline && isDemoDomain && (
        <AlertBanner tone="info">
          Esta instituição utiliza um endereço de demonstração. O Webmail e os benefícios externos
          ficam ativos após o registo do domínio definitivo <code>.edu.ao</code>.
        </AlertBanner>
      )}
    </Card>
  );
}
