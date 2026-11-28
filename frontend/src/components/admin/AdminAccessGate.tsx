'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { AlertBanner, Button, Card, StatusBadge } from '@/components/ui';
import type { AuthUser } from '@/lib/auth';
import { buildSchoolSiteHref } from '@/lib/siteUrls';
import OnboardingTab from './OnboardingTab';
import type { FeedbackState } from './types';

interface AdminAccessGateProps {
  authUser: AuthUser;
  surfaceMode: 'admin' | 'ops';
  onLogout: () => void;
}

/** Role-based access denial card separating `/ops`, `/admin`, and `/portal`. */
export function AdminAccessGate({ authUser, surfaceMode, onLogout }: AdminAccessGateProps) {
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
        <a
          href={targetHref}
          className="min-h-[40px] inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
        >
          {targetLabel}
        </a>
        <Button type="button" variant="outline" size="sm" onClick={onLogout}>
          Terminar Sessão
        </Button>
      </div>
    </Card>
  );
}

interface AdminFeedbackBannerProps {
  feedback: FeedbackState | null;
  isLocalHostBrowser: boolean;
  onDismiss: () => void;
}

/** Global feedback banner for admin/ops operations with optional live site links and steps. */
export function AdminFeedbackBanner({
  feedback,
  isLocalHostBrowser,
  onDismiss,
}: AdminFeedbackBannerProps) {
  if (!feedback) return null;

  return (
    <AlertBanner
      tone={feedback.type === 'success' ? 'success' : 'error'}
      onDismiss={onDismiss}
      dismissLabel="Fechar aviso"
    >
      <p className="font-semibold">{feedback.message}</p>
      {feedback.details && (
        <div className="mt-2 text-xs font-mono bg-white/80 p-3 rounded-lg border border-stone-200 space-y-1 text-stone-800">
          {feedback.details.effective_site_host && (
            <p>
              <strong>Site:</strong>{' '}
              <a
                href={buildSchoolSiteHref(feedback.details.effective_site_host, isLocalHostBrowser)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-800 underline"
              >
                {isLocalHostBrowser
                  ? buildSchoolSiteHref(feedback.details.effective_site_host, isLocalHostBrowser)
                  : `https://${feedback.details.effective_site_host}`}
              </a>
            </p>
          )}
          {feedback.details.domain && (
            <p>
              <strong>Domínio Oficial:</strong> {feedback.details.domain}
            </p>
          )}
          {Array.isArray(feedback.details.next_steps) && (
            <ul className="list-disc list-inside pt-1 font-sans">
              {feedback.details.next_steps.map((step: string, i: number) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AlertBanner>
  );
}

interface AdminFirstRunOnboardingProps {
  authUser: AuthUser;
  feedback: FeedbackState | null;
  isLocalHostBrowser: boolean;
  onLogout: () => void;
  onDismissFeedback: () => void;
  onSchoolCreated: (schoolId: string) => Promise<void>;
  onFeedback: (fb: FeedbackState | null) => void;
}

/** Focused onboarding view without sidebar for first-time school secretaries. */
export function AdminFirstRunOnboarding({
  authUser,
  feedback,
  isLocalHostBrowser,
  onLogout,
  onDismissFeedback,
  onSchoolCreated,
  onFeedback,
}: AdminFirstRunOnboardingProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card padding="md" className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <StatusBadge tone="brand" className="mb-1.5">
            Primeiro Acesso · Secretaria Escolar
          </StatusBadge>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900">
            Configure a sua instituição na EduLink
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Em poucos minutos gera o site institucional, prepara o pedido .edu.ao e ativa o acesso
            ao Google Workspace, Microsoft 365 e Canva Educação.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onLogout}>
          Sair ({authUser.email})
        </Button>
      </Card>

      <AdminFeedbackBanner
        feedback={feedback}
        isLocalHostBrowser={isLocalHostBrowser}
        onDismiss={onDismissFeedback}
      />

      <OnboardingTab onSchoolCreated={onSchoolCreated} onFeedback={onFeedback} />
    </div>
  );
}
