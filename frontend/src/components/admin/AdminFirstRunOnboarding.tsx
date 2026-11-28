'use client';

import React from 'react';
import { Button, Card, StatusBadge } from '@/components/ui';
import type { AuthUser } from '@/lib/auth';
import AdminFeedbackBanner from './AdminFeedbackBanner';
import OnboardingTab from './OnboardingTab';
import type { FeedbackState } from './types';

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
export default function AdminFirstRunOnboarding({
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
