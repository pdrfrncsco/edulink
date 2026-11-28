'use client';

import React from 'react';
import { AlertBanner } from '@/components/ui';
import { buildSchoolSiteHref } from '@/lib/siteUrls';
import type { FeedbackState } from './types';

interface AdminFeedbackBannerProps {
  feedback: FeedbackState | null;
  isLocalHostBrowser: boolean;
  onDismiss: () => void;
}

/** Global feedback banner for admin/ops operations with optional live site links and steps. */
export default function AdminFeedbackBanner({
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
