import React from 'react';
import type { PublicSchoolData } from '@/lib/siteServerContext';

interface SchoolSiteFooterProps {
  school: PublicSchoolData;
  privacyHref: string;
  portalUrl: string;
  adminUrl: string;
}

/** Public footer for generated institutional school portals. */
export default function SchoolSiteFooter({
  school,
  privacyHref,
  portalUrl,
  adminUrl,
}: SchoolSiteFooterProps) {
  return (
    <footer className="border-t border-stone-200 bg-white py-8 text-xs text-stone-600">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-center sm:text-left space-y-1">
          <p className="font-semibold text-stone-800">{school.name}</p>
          <p>
            E-mail:{' '}
            <a href={`mailto:${school.contact_email}`} className="underline">
              {school.contact_email}
            </a>
            {school.phone ? ` • Tel.: ${school.phone}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-stone-500">
          <a href={privacyHref} className="hover:text-stone-900 underline">
            Política de Privacidade (APD)
          </a>
          <a href={portalUrl} className="hover:text-stone-900 underline">
            Portal do Aluno
          </a>
          <a href={adminUrl} className="hover:text-stone-900 underline">
            Secretaria
          </a>
        </div>
      </div>
    </footer>
  );
}
