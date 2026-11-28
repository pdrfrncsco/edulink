'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  authFetch,
  type AuthUser,
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  updateStoredUser,
} from '@/lib/auth';
import {
  AuthSessionError,
  OFFLINE_PASSPORT_KEY,
  decodeJwtExp,
  isNetworkFailure,
  readCachedPassport,
  type CatalogOffer,
  type PassportData,
  type PortalTab,
} from './types';
import { useOnlineStatus } from './useOnlineStatus';

/** Manages PWA Service Worker, JWT passport issuance, QR generation, and safe offline fallback. */
export function usePortalSession() {
  const isOnline = useOnlineStatus();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<PortalTab>('card');
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
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

  const handleLogout = () => {
    clearAuthSession();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(OFFLINE_PASSPORT_KEY);
    }
    setAuthUser(null);
    setPassport(null);
    setOffers([]);
    setQrDataUrl('');
    setQrFullscreen(false);
    setIsOfflineCache(false);
    setError('');
  };

  const loadBenefitCatalog = async () => {
    try {
      const res = await authFetch('/benefits/catalog/');
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        setError('A sua sessão ou matrícula foi revogada. Inicie sessão novamente.');
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setOffers(Array.isArray(data) ? data : data.results || []);
    } catch {
      // Offline: mantém catálogo vazio sem afetar o cartão
    }
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
        schoolPrimaryColor:
          issueData.school_primary_color || user.school_primary_color || '#0D9488',
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
        const cachedCard = readCachedPassport(user.academic_user.institutional_email);
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
        const cachedCard = readCachedPassport(cachedUser?.academic_user?.institutional_email);
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
  const isTokenExpired = Boolean(passport?.tokenExpiresAt && Date.now() > passport.tokenExpiresAt);
  const isOffline = !isOnline || isOfflineCache;

  return {
    authUser,
    authReady,
    activeTab,
    setActiveTab,
    passport,
    qrDataUrl,
    qrFullscreen,
    setQrFullscreen,
    isOffline,
    isOfflineCache,
    error,
    offers,
    showBenefitsTab,
    isTeacher,
    isSuspended,
    isTokenExpired,
    syncPortalSession,
    handleAuthenticated,
    handleLogout,
  };
}
