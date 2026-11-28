'use client';

import React from 'react';
import { AlertBanner, Button, SkeletonCard, TabPanel } from '@/components/ui';
import AuthCard from '@/components/auth/AuthCard';
import AccountTab from '@/components/portal/AccountTab';
import BenefitsTab from '@/components/portal/BenefitsTab';
import CloudAppsTab from '@/components/portal/CloudAppsTab';
import PassportCard from '@/components/portal/PassportCard';
import PortalAdminRedirectCard from '@/components/portal/PortalAdminRedirectCard';
import PortalBottomNav from '@/components/portal/PortalBottomNav';
import QrFullscreenModal from '@/components/portal/QrFullscreenModal';
import { usePortalSession } from '@/components/portal/usePortalSession';
import { formatDateTimeAO } from '@/lib/formatters';

export default function PortalStudentPage() {
  const portal = usePortalSession();

  if (!portal.authReady) {
    return (
      <div
        className="max-w-lg mx-auto py-8 space-y-4"
        role="status"
        aria-busy="true"
        aria-label="A carregar Passaporte Digital"
      >
        <SkeletonCard rows={4} />
        <SkeletonCard rows={3} />
      </div>
    );
  }

  if (!portal.authUser) {
    return <AuthCard mode="academic" onAuthenticated={portal.handleAuthenticated} />;
  }

  if (
    portal.authUser.role === 'PLATFORM_ADMIN' ||
    portal.authUser.role === 'SCHOOL_SECRETARY'
  ) {
    return (
      <PortalAdminRedirectCard authUser={portal.authUser} onLogout={portal.handleLogout} />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto pb-24 space-y-4">
      {portal.isOfflineCache && (
        <AlertBanner tone="warning">
          <p>Modo offline ativo — a exibir o último cartão assinado neste dispositivo.</p>
          {portal.passport?.tokenExpiresAt && (
            <p className="font-semibold mt-0.5">
              {portal.isTokenExpired
                ? 'Atenção: o QR em cache expirou. Ligue-se à internet para renovar.'
                : `Válido até ${formatDateTimeAO(portal.passport.tokenExpiresAt)}.`}
            </p>
          )}
        </AlertBanner>
      )}

      {portal.error && (
        <AlertBanner
          tone="error"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => portal.syncPortalSession()}
            >
              Tentar novamente
            </Button>
          }
        >
          {portal.error}
        </AlertBanner>
      )}

      {portal.passport && (
        <TabPanel idPrefix="portal-tab" tabId="card" active={portal.activeTab === 'card'}>
          <PassportCard
            passport={portal.passport}
            qrDataUrl={portal.qrDataUrl}
            isTeacher={portal.isTeacher}
            isSuspended={portal.isSuspended}
            onOpenQrFullscreen={() => portal.setQrFullscreen(true)}
          />
        </TabPanel>
      )}

      {portal.passport && (
        <TabPanel idPrefix="portal-tab" tabId="apps" active={portal.activeTab === 'apps'}>
          <CloudAppsTab
            passport={portal.passport}
            isTeacher={portal.isTeacher}
            isSuspended={portal.isSuspended}
            isOffline={portal.isOffline}
            isTokenExpired={portal.isTokenExpired}
            onSync={() => portal.syncPortalSession()}
          />
        </TabPanel>
      )}

      {portal.passport && portal.showBenefitsTab && (
        <TabPanel
          idPrefix="portal-tab"
          tabId="benefits"
          active={portal.activeTab === 'benefits'}
        >
          <BenefitsTab
            offers={portal.offers}
            isSuspended={portal.isSuspended}
            enableOnlinePayments={Boolean(portal.authUser.enable_online_payments)}
            onGoToApps={() => portal.setActiveTab('apps')}
          />
        </TabPanel>
      )}

      <TabPanel idPrefix="portal-tab" tabId="account" active={portal.activeTab === 'account'}>
        <AccountTab
          authUser={portal.authUser}
          passport={portal.passport}
          isTeacher={portal.isTeacher}
          isSuspended={portal.isSuspended}
          onSync={() => portal.syncPortalSession()}
          onLogout={portal.handleLogout}
        />
      </TabPanel>

      <QrFullscreenModal
        open={portal.qrFullscreen}
        passport={portal.passport}
        qrDataUrl={portal.qrDataUrl}
        onClose={() => portal.setQrFullscreen(false)}
      />

      <PortalBottomNav
        activeTab={portal.activeTab}
        showBenefitsTab={portal.showBenefitsTab}
        onChangeTab={portal.setActiveTab}
      />
    </div>
  );
}
