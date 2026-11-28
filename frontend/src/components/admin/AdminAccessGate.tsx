'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button, ButtonLink, Card } from '@/components/ui';
import type { AuthUser } from '@/lib/auth';

interface AdminAccessGateProps {
  authUser: AuthUser;
  surfaceMode: 'admin' | 'ops';
  onLogout: () => void;
}

/** Role-based access denial card separating `/ops`, `/admin`, and `/portal`. */
export default function AdminAccessGate({ authUser, surfaceMode, onLogout }: AdminAccessGateProps) {
  const isOpsSurface = surfaceMode === 'ops';
  const targetHref = authUser.role === 'SCHOOL_SECRETARY' ? '/admin' : '/portal';
  const targetLabel =
    authUser.role === 'SCHOOL_SECRETARY' ? 'Ir para Painel da Escola' : 'Ir para Portal PWA';

  return (
    <Card padding="lg" className="max-w-lg mx-auto text-center space-y-4">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-700">
        <ShieldAlert className="h-5 w-5" aria-hidden="true" />
      </div>
      <h1 className="text-lg font-bold text-stone-900">
        {isOpsSurface
          ? 'Área Exclusiva da Operação EduLink (/ops)'
          : 'Acesso Restrito à Secretaria'}
      </h1>
      <p className="text-sm text-stone-600">
        A sua conta (<span className="font-mono">{authUser.email}</span>) tem o perfil{' '}
        <strong>{authUser.role}</strong>.{' '}
        {isOpsSurface
          ? 'Para gerir a sua instituição, utilize o Painel da Secretaria.'
          : 'Utilize o Portal do Aluno/Docente para aceder ao Passaporte Digital.'}
      </p>
      <div className="flex flex-wrap justify-center gap-3 pt-1">
        <ButtonLink href={targetHref} size="md">
          {targetLabel}
        </ButtonLink>
        <Button type="button" variant="outline" size="sm" onClick={onLogout}>
          Terminar Sessão
        </Button>
      </div>
    </Card>
  );
}
