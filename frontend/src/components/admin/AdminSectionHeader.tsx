'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { AlertBanner, ButtonLink, Card, StatusBadge } from '@/components/ui';
import { buildSchoolSiteHref } from '@/lib/siteUrls';
import SchoolSelectorBar from './SchoolSelectorBar';
import type { NavItem, SectionKey } from './navigation';
import type { School } from './types';

interface AdminSectionHeaderProps {
  surfaceMode: 'admin' | 'ops';
  isPlatformAdmin: boolean;
  schools: School[];
  selectedSchoolId: string;
  activeSchool: School | null;
  activeSection: SectionKey;
  currentNavMeta?: NavItem;
  effectiveHost: string;
  isDemoMode: boolean;
  isLocalHostBrowser: boolean;
  onSelectSchool: (id: string) => void;
  onRefreshSchools: () => void;
}

/** Contextual /ops notice, tenant selector bar, and active section header with live site preview link. */
export default function AdminSectionHeader({
  surfaceMode,
  isPlatformAdmin,
  schools,
  selectedSchoolId,
  activeSchool,
  activeSection,
  currentNavMeta,
  effectiveHost,
  isDemoMode,
  isLocalHostBrowser,
  onSelectSchool,
  onRefreshSchools,
}: AdminSectionHeaderProps) {
  const showSchoolMeta =
    Boolean(activeSchool) && activeSection !== 'platform_ops' && activeSection !== 'onboarding';

  return (
    <>
      {isPlatformAdmin && surfaceMode === 'admin' && (
        <AlertBanner
          tone="warning"
          action={
            <ButtonLink
              href="/ops"
              size="sm"
              className="bg-amber-900 hover:bg-amber-950 text-white"
              rightIcon={<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Abrir Backoffice Multi-Tenant (/ops)
            </ButtonLink>
          }
        >
          Está a visualizar o <strong>Painel da Secretaria (/admin)</strong>. Para revisão
          documental, RBAC global, feature flags e exportação SAF-T XML utilize a consola
          dedicada <code>/ops</code>.
        </AlertBanner>
      )}

      {isPlatformAdmin && (
        <SchoolSelectorBar
          schools={schools}
          selectedSchoolId={selectedSchoolId}
          onSelectSchool={onSelectSchool}
          onRefreshSchools={onRefreshSchools}
        />
      )}

      <Card padding="md" className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
              {currentNavMeta?.label}
            </h1>
            {showSchoolMeta && (
              <StatusBadge tone={isDemoMode ? 'warning' : 'success'}>
                {isDemoMode ? 'Modo Demonstração' : 'Domínio Oficial'}
              </StatusBadge>
            )}
          </div>
          <p className="text-xs text-stone-500">{currentNavMeta?.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {showSchoolMeta && effectiveHost && (
            <ButtonLink
              href={buildSchoolSiteHref(effectiveHost, isLocalHostBrowser)}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              size="md"
              className="min-h-[38px] bg-stone-50 px-3 py-2 font-mono text-stone-800 hover:bg-stone-100"
              rightIcon={<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              {isLocalHostBrowser ? `Pré-visualizar Site (${effectiveHost})` : effectiveHost}
            </ButtonLink>
          )}
        </div>
      </Card>
    </>
  );
}
