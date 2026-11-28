import React from 'react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import type { PublicSchoolData } from '@/lib/siteServerContext';

interface SchoolSiteHeaderProps {
  school: PublicSchoolData;
  effectiveHost: string;
  brandColor: string;
  brandForeground: string;
  portalUrl: string;
  adminUrl: string;
}

/** Sticky institutional site header with school emblem, host badge, and portal links. */
export default function SchoolSiteHeader({
  school,
  effectiveHost,
  brandColor,
  brandForeground,
  portalUrl,
  adminUrl,
}: SchoolSiteHeaderProps) {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {school.logo_url ? (
            <img
              src={school.logo_url}
              alt={`Logótipo de ${school.name}`}
              className="w-12 h-12 rounded-2xl border border-stone-200 bg-white object-contain p-1 shrink-0 shadow-sm"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow shrink-0"
              style={{ backgroundColor: brandColor, color: brandForeground }}
            >
              {school.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-bold text-base sm:text-xl text-stone-900 leading-tight truncate">
              {school.name}
            </h1>
            <div className="flex items-center gap-2 text-xs text-stone-500 truncate">
              <span className="font-mono text-teal-800 font-semibold truncate">{effectiveHost}</span>
              <span aria-hidden="true">•</span>
              <span className="truncate">
                {school.municipality}, {school.province}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ButtonLink href={portalUrl} variant="outline" size="md" className="px-3 sm:px-4 text-xs">
            Portal PWA
          </ButtonLink>
          <ButtonLink
            href={adminUrl}
            size="md"
            className="hidden sm:inline-flex text-xs hover:opacity-95"
            style={{ backgroundColor: brandColor, color: brandForeground }}
          >
            Secretaria Online
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
