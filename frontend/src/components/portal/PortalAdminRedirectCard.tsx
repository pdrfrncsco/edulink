'use client';

import React from 'react';
import { Button, ButtonLink, Card, StatusBadge } from '@/components/ui';
import type { AuthUser } from '@/lib/auth';

interface PortalAdminRedirectCardProps {
  authUser: AuthUser;
  onLogout: () => void;
}

/** Redirects administrative accounts away from the student/teacher PWA portal to `/admin` or `/ops`. */
export default function PortalAdminRedirectCard({
  authUser,
  onLogout,
}: PortalAdminRedirectCardProps) {
  const isPlatformAdmin = authUser.role === 'PLATFORM_ADMIN';

  return (
    <Card padding="lg" className="w-full max-w-md text-center space-y-4">
      <StatusBadge tone="warning">
        {isPlatformAdmin ? 'Administração da Plataforma' : 'Secretaria Escolar'}
      </StatusBadge>
      <h1 className="text-lg font-bold text-stone-900">Acesso Administrativo</h1>
      <p className="text-sm text-stone-600">
        A conta <span className="font-mono">{authUser.email}</span> destina-se ao Painel
        Administrativo e não possui Passaporte de Estudante/Docente.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href={isPlatformAdmin ? '/ops' : '/admin'} size="md" className="text-xs">
          {isPlatformAdmin ? 'Ir para Backoffice /ops' : 'Ir para Painel Administrativo'}
        </ButtonLink>
        <Button type="button" variant="outline" size="md" onClick={onLogout}>
          Sair
        </Button>
      </div>
    </Card>
  );
}
