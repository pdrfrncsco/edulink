'use client';

import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { AlertBanner, Button, Card, StatusBadge, TabPanel } from '@/components/ui';
import AuthCard from '@/components/auth/AuthCard';
import AccountTab from '@/components/portal/AccountTab';
import BenefitsTab from '@/components/portal/BenefitsTab';
import CloudAppsTab from '@/components/portal/CloudAppsTab';
import PassportCard from '@/components/portal/PassportCard';
import PortalBottomNav from '@/components/portal/PortalBottomNav';
import QrFullscreenModal from '@/components/portal/QrFullscreenModal';
import {
  AuthSessionError,
  OFFLINE_PASSPORT_KEY,
  buildCloudApps,
  buildGlobalPerks,
  decodeJwtExp,
  isNetworkFailure,
  readCachedPassport,
  type CatalogOffer,
  type PassportData,
  type PortalTab,
} from '@/components/portal/types';
import {
  authFetch,
  AuthUser,
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  updateStoredUser,
} from '@/lib/auth';
import { formatDateTimeAO } from '@/lib/formatters';

export default function PortalStudentPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<PortalTab>('card');

  const [passport, setPassport] = useState<PassportData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const [isOfflineCache, setIsOfflineCache] = useState(false);
  const [error, setError] = useState('');
  const [offers, setOffers] = useState<CatalogOffer[]>([]);

  const renderQrFromUrl = async (verifyUrl: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 280,
        margin: 1,
        color: { dark: '#1c1917', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl('');
    }
  };

  const loadBenefitCatalog = async () => {
    try {
      const res = await authFetch('/benefits/catalog/');
      if (!res.ok) return;
      const data = await res.json();
      setOffers(Array.isArray(data) ? data : data.results || []);
    } catch {
      // Offline: mantém catálogo vazio sem afetar o cartão
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(OFFLINE_PASSPORT_KEY);
    }
    setAuthUser(null);
    setPassport(null);
    setQrDataUrl('');
    setQrFullscreen(false);
    setIsOfflineCache(false);
    setError('');
  };

  const fetchRealPassport = async (user: AuthUser) => {
    setError('');
    setIsOfflineCache(false);

    if (!user.academic_user) {
      setError('A sua conta não possui um registo académico (Estudante/Docente) associado.');
      return;
    }

    try {
      const issueRes = await authFetch('/passport/issue/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.academic_user.id }),
      });

      if (issueRes.status === 401 || issueRes.status === 403) {
        throw new AuthSessionError(
          'A sua sessão ou matrícula foi revogada. Inicie sessão novamente.',
          issueRes.status
        );
      }

      const issueData = await issueRes.json();
      if (!issueRes.ok) {
        throw new Error(issueData.detail || 'Falha ao emitir Passaporte Digital.');
      }

      const verifyPath = `/verify?token=${encodeURIComponent(issueData.token)}`;
      const fullVerifyUrl =
        typeof window !== 'undefined' ? `${window.location.origin}${verifyPath}` : verifyPath;

      const card: PassportData = {
        fullName: user.academic_user.full_name,
        role: user.academic_user.role,
        institutionalEmail: user.academic_user.institutional_email,
        schoolName: issueData.school_name || user.school_name || 'Instituição EduLink',
        schoolDomain: issueData.school_domain || user.school_domain || 'edulink.ao',
        schoolPrimaryColor: issueData.school_primary_color || user.school_primary_color || '#0D9488',
        schoolLogoUrl: issueData.school_logo_url ?? user.school_logo_url ?? null,
        institutionType: issueData.institution_type || user.institution_type || 'MED_K12',
        biNumber: user.academic_user.bi_or_student_id,
        gradeClass: user.academic_user.grade_class || 'Matrícula Ativa',
        academicYear: user.academic_user.academic_year || '2026/2027',
        status:
          user.academic_user.enrollment_status ||
          (user.academic_user.is_active ? 'ACTIVE' : 'SUSPENDED'),
        token: issueData.token,
        tokenExpiresAt: decodeJwtExp(issueData.token),
        verificationUrl: fullVerifyUrl,
      };

      setPassport(card);
      localStorage.setItem(OFFLINE_PASSPORT_KEY, JSON.stringify(card));
      await renderQrFromUrl(fullVerifyUrl);
      if (user.enable_benefits_club) {
        loadBenefitCatalog();
      }
    } catch (err: any) {
      if (err instanceof AuthSessionError) {
        handleLogout();
        setError(err.message);
        return;
      }

      if (isNetworkFailure(err)) {
        const cachedCard = readCachedPassport();
        if (cachedCard) {
          setPassport(cachedCard);
          setIsOfflineCache(true);
          await renderQrFromUrl(cachedCard.verificationUrl);
          return;
        }
      }

      setError(err?.message || 'Erro ao emitir o Passaporte Académico.');
    }
  };

  const syncPortalSession = async () => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const token = getAccessToken();
    const cachedUser = getStoredUser();
    if (!token) {
      setAuthReady(true);
      return;
    }

    if (cachedUser) setAuthUser(cachedUser);

    try {
      const meRes = await authFetch('/auth/me/');
      if (meRes.status === 401 || meRes.status === 403) {
        throw new AuthSessionError('Sessão expirada ou acesso suspenso.', meRes.status);
      }
      if (!meRes.ok) {
        throw new Error('Servidor temporariamente indisponível.');
      }

      const me = (await meRes.json()) as AuthUser;
      setAuthUser(me);
      updateStoredUser(me);
      await fetchRealPassport(me);
    } catch (err: any) {
      if (err instanceof AuthSessionError) {
        handleLogout();
      } else if (isNetworkFailure(err)) {
        const cachedCard = readCachedPassport();
        if (cachedUser && cachedCard) {
          setPassport(cachedCard);
          setIsOfflineCache(true);
          await renderQrFromUrl(cachedCard.verificationUrl);
        } else {
          setError('Sem ligação à internet e sem cartão guardado neste dispositivo.');
        }
      } else {
        setError(err?.message || 'Não foi possível sincronizar a sua sessão.');
      }
    } finally {
      setAuthReady(true);
    }
  };

  useEffect(() => {
    syncPortalSession();
  }, []);

  const showBenefitsTab = Boolean(authUser?.enable_benefits_club);
  useEffect(() => {
    if (!showBenefitsTab && activeTab === 'benefits') {
      setActiveTab('card');
    }
  }, [showBenefitsTab, activeTab]);

  const handleAuthenticated = async (user: AuthUser) => {
    setAuthUser(user);
    await fetchRealPassport(user);
  };

  const isTeacher = passport?.role === 'TEACHER';
  const isSuspended = passport?.status === 'SUSPENDED';
  const isCanvaFreeK12 = passport?.institutionType !== 'MESCTI_HIGHER_ED';
  const isTokenExpired = Boolean(passport?.tokenExpiresAt && Date.now() > passport.tokenExpiresAt);

  const cloudApps = useMemo(
    () => buildCloudApps(passport, isTeacher, isCanvaFreeK12),
    [passport, isTeacher, isCanvaFreeK12]
  );

  const globalPerks = useMemo(() => buildGlobalPerks(isTeacher), [isTeacher]);

  if (!authReady) {
    return (
      <p className="text-sm text-stone-500 py-12 text-center" role="status">
        A carregar Passaporte Digital...
      </p>
    );
  }

  if (!authUser) {
    return <AuthCard mode="academic" onAuthenticated={handleAuthenticated} />;
  }

  if (authUser.role === 'PLATFORM_ADMIN' || authUser.role === 'SCHOOL_SECRETARY') {
    return (
      <Card padding="lg" className="w-full max-w-md text-center space-y-4">
        <StatusBadge tone="warning">
          {authUser.role === 'PLATFORM_ADMIN' ? 'Administração da Plataforma' : 'Secretaria Escolar'}
        </StatusBadge>
        <h1 className="text-lg font-bold text-stone-900">Acesso Administrativo</h1>
        <p className="text-sm text-stone-600">
          A conta <span className="font-mono">{authUser.email}</span> destina-se ao Painel
          Administrativo e não possui Passaporte de Estudante/Docente.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={authUser.role === 'PLATFORM_ADMIN' ? '/ops' : '/admin'}
            className="min-h-[40px] inline-flex items-center justify-center px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800"
          >
            {authUser.role === 'PLATFORM_ADMIN'
              ? 'Ir para Backoffice /ops'
              : 'Ir para Painel Administrativo'}
          </a>
          <Button type="button" variant="outline" size="md" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto pb-24 space-y-4">
      {isOfflineCache && (
        <AlertBanner tone="warning">
          <p>Modo offline ativo — a exibir o último cartão assinado neste dispositivo.</p>
          {passport?.tokenExpiresAt && (
            <p className="font-semibold mt-0.5">
              {isTokenExpired
                ? 'Atenção: o QR em cache expirou. Ligue-se à internet para renovar.'
                : `Válido até ${formatDateTimeAO(passport.tokenExpiresAt)}.`}
            </p>
          )}
        </AlertBanner>
      )}

      {error && (
        <AlertBanner
          tone="error"
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => syncPortalSession()}>
              Tentar novamente
            </Button>
          }
        >
          {error}
        </AlertBanner>
      )}

      {passport && (
        <TabPanel idPrefix="portal-tab" tabId="card" active={activeTab === 'card'}>
          <PassportCard
            passport={passport}
            qrDataUrl={qrDataUrl}
            isTeacher={isTeacher}
            isSuspended={isSuspended}
            onOpenQrFullscreen={() => setQrFullscreen(true)}
          />
        </TabPanel>
      )}

      {passport && (
        <TabPanel idPrefix="portal-tab" tabId="apps" active={activeTab === 'apps'}>
          <CloudAppsTab
            passport={passport}
            isSuspended={isSuspended}
            cloudApps={cloudApps}
            globalPerks={globalPerks}
          />
        </TabPanel>
      )}

      {passport && showBenefitsTab && (
        <TabPanel idPrefix="portal-tab" tabId="benefits" active={activeTab === 'benefits'}>
          <BenefitsTab
            offers={offers}
            isSuspended={isSuspended}
            enableOnlinePayments={Boolean(authUser.enable_online_payments)}
            onGoToApps={() => setActiveTab('apps')}
          />
        </TabPanel>
      )}

      <TabPanel idPrefix="portal-tab" tabId="account" active={activeTab === 'account'}>
        <AccountTab
          authUser={authUser}
          passport={passport}
          isTeacher={isTeacher}
          isSuspended={isSuspended}
          onSync={() => syncPortalSession()}
          onLogout={handleLogout}
        />
      </TabPanel>

      <QrFullscreenModal
        open={qrFullscreen}
        passport={passport}
        qrDataUrl={qrDataUrl}
        onClose={() => setQrFullscreen(false)}
      />

      <PortalBottomNav
        activeTab={activeTab}
        showBenefitsTab={showBenefitsTab}
        onChangeTab={setActiveTab}
      />
    </div>
  );
}
