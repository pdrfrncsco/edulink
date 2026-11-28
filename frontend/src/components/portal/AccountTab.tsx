'use client';

import React from 'react';
import { ExternalLink, LogOut, RefreshCw } from 'lucide-react';
import { Button, Card, StatusBadge } from '@/components/ui';
import type { AuthUser } from '@/lib/auth';
import { KEYCLOAK_ACCOUNT_URL, type PassportData } from './types';

interface AccountTabProps {
  authUser: AuthUser;
  passport: PassportData | null;
  isTeacher: boolean;
  isSuspended: boolean;
  onSync: () => void;
  onLogout: () => void;
}

/** Academic account details, SSO password link, manual sync, and session logout. */
export default function AccountTab({
  authUser,
  passport,
  isTeacher,
  isSuspended,
  onSync,
  onLogout,
}: AccountTabProps) {
  return (
    <Card padding="md" className="space-y-4">
      <div>
        <StatusBadge tone="brand" className="mb-1.5">
          {isTeacher ? 'Conta Docente' : 'Conta Estudantil'}
        </StatusBadge>
        <h2 className="text-base font-bold text-stone-900">
          {passport?.fullName || authUser.email}
        </h2>
        <p className="text-xs font-mono text-stone-600 break-all">
          {passport?.institutionalEmail || authUser.email}
        </p>
      </div>

      {passport && (
        <dl className="grid grid-cols-2 gap-3 text-xs border-y border-stone-100 py-3">
          <div>
            <dt className="text-[10px] uppercase text-stone-500">Instituição</dt>
            <dd className="font-semibold text-stone-900">{passport.schoolName}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-stone-500">Estado da Matrícula</dt>
            <dd>
              <StatusBadge tone={isSuspended ? 'error' : 'success'} dot>
                {isSuspended ? 'Suspensa' : 'Ativa'}
              </StatusBadge>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-stone-500">BI / Processo</dt>
            <dd className="font-mono font-semibold text-stone-900">{passport.biNumber}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-stone-500">Turma / Área</dt>
            <dd className="font-semibold text-stone-900">{passport.gradeClass}</dd>
          </div>
        </dl>
      )}

      <div className="space-y-2.5">
        <a
          href={KEYCLOAK_ACCOUNT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-stone-900 text-white text-xs font-semibold text-center hover:bg-stone-800 transition"
        >
          <span>Alterar Palavra-passe Única (SSO)</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <Button
          type="button"
          variant="outline"
          size="lg"
          fullWidth
          onClick={onSync}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Atualizar Cartão e Sincronizar
        </Button>
        <Button
          type="button"
          variant="danger"
          size="lg"
          fullWidth
          onClick={onLogout}
          leftIcon={<LogOut className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Terminar Sessão
        </Button>
      </div>
    </Card>
  );
}
