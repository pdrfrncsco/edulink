'use client';

import React from 'react';
import { SkeletonCard } from '@/components/ui';
import AuthCard from '@/components/auth/AuthCard';
import { useIsLocalHost } from '@/lib/useIsLocalHost';
import AdminAccessGate from './AdminAccessGate';
import AdminFeedbackBanner from './AdminFeedbackBanner';
import AdminFirstRunOnboarding from './AdminFirstRunOnboarding';
import AdminSectionContent from './AdminSectionContent';
import AdminSectionHeader from './AdminSectionHeader';
import AdminSidebar from './AdminSidebar';
import { useAdminWorkspace } from './useAdminWorkspace';

interface AdminShellProps {
  surfaceMode?: 'admin' | 'ops';
}

/**
 * Shared authenticated workspace shell separating `/admin` (School Secretariat)
 * and `/ops` (EduLink multi-tenant Backoffice).
 */
export default function AdminShell({ surfaceMode = 'admin' }: AdminShellProps) {
  const isLocalHostBrowser = useIsLocalHost();
  const ws = useAdminWorkspace(surfaceMode);

  if (!ws.authReady) {
    return (
      <div
        className="space-y-6 py-4"
        role="status"
        aria-busy="true"
        aria-label="A verificar sessão autenticada"
      >
        <SkeletonCard rows={2} />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <SkeletonCard rows={5} className="lg:col-span-1" />
          <div className="lg:col-span-3 space-y-4">
            <SkeletonCard rows={4} />
            <SkeletonCard rows={4} />
          </div>
        </div>
      </div>
    );
  }

  if (!ws.authUser) {
    return (
      <div className="py-8 max-w-md mx-auto">
        <AuthCard mode="secretary" onAuthenticated={ws.handleAuthenticated} />
      </div>
    );
  }

  if (
    (surfaceMode === 'ops' && !ws.isPlatformAdmin) ||
    (ws.authUser.role !== 'PLATFORM_ADMIN' && ws.authUser.role !== 'SCHOOL_SECRETARY')
  ) {
    return (
      <AdminAccessGate
        authUser={ws.authUser}
        surfaceMode={surfaceMode}
        onLogout={ws.handleLogout}
      />
    );
  }

  if (!ws.isPlatformAdmin && !ws.hasSchool) {
    return (
      <AdminFirstRunOnboarding
        authUser={ws.authUser}
        feedback={ws.feedback}
        isLocalHostBrowser={isLocalHostBrowser}
        onLogout={ws.handleLogout}
        onDismissFeedback={() => ws.setFeedback(null)}
        onSchoolCreated={async (id) => {
          await ws.syncSession();
          await ws.loadSchools(id);
          ws.navigateTo('overview');
        }}
        onFeedback={ws.setFeedback}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
      <AdminSidebar
        authUser={ws.authUser}
        activeSchool={ws.activeSchool}
        effectiveHost={ws.effectiveHost}
        navItems={ws.navItems}
        activeSection={ws.activeSection}
        isPlatformAdmin={ws.isPlatformAdmin && surfaceMode === 'ops'}
        mobileNavOpen={ws.mobileNavOpen}
        onToggleMobileNav={() => ws.setMobileNavOpen((prev) => !prev)}
        onNavigate={ws.navigateTo}
        onLogout={ws.handleLogout}
      />

      <div className="min-w-0 space-y-5">
        <AdminSectionHeader
          surfaceMode={surfaceMode}
          isPlatformAdmin={ws.isPlatformAdmin}
          schools={ws.schools}
          selectedSchoolId={ws.selectedSchoolId}
          activeSchool={ws.activeSchool}
          activeSection={ws.activeSection}
          currentNavMeta={ws.currentNavMeta}
          effectiveHost={ws.effectiveHost}
          isDemoMode={ws.isDemoMode}
          isLocalHostBrowser={isLocalHostBrowser}
          onSelectSchool={ws.selectSchool}
          onRefreshSchools={() => ws.loadSchools(ws.selectedSchoolId)}
        />

        <AdminFeedbackBanner
          feedback={ws.feedback}
          isLocalHostBrowser={isLocalHostBrowser}
          onDismiss={() => ws.setFeedback(null)}
        />

        <AdminSectionContent
          activeSection={ws.activeSection}
          surfaceMode={surfaceMode}
          authUser={ws.authUser}
          isPlatformAdmin={ws.isPlatformAdmin}
          erpFeatureEnabled={ws.erpFeatureEnabled}
          benefitsFeatureEnabled={ws.benefitsFeatureEnabled}
          schools={ws.schools}
          schoolsLoading={ws.schoolsLoading}
          selectedSchoolId={ws.selectedSchoolId}
          activeSchool={ws.activeSchool}
          onSelectSchool={ws.selectSchool}
          onNavigate={ws.navigateTo}
          onLoadSchools={ws.loadSchools}
          onFeedback={ws.setFeedback}
        />
      </div>
    </div>
  );
}
