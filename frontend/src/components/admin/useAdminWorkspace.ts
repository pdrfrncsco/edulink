'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AuthUser,
  clearAuthSession,
  getAccessToken,
  getStoredUser,
  updateStoredUser,
} from '@/lib/auth';
import {
  buildAdminNavItems,
  getSectionFromUrl,
  resolveEffectiveHost,
  syncSectionToUrl,
  type SectionKey,
} from './navigation';
import { apiJson, type FeedbackState, type School } from './types';

/** Manages authenticated admin/ops session, active tenant selection, feature flags, and section routing. */
export function useAdminWorkspace(surfaceMode: 'admin' | 'ops') {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>(
    surfaceMode === 'ops' ? 'platform_ops' : 'overview'
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const loadSchools = async (preferSchoolId?: string) => {
    setSchoolsLoading(true);
    try {
      const data = await apiJson<{ results?: School[] } | School[]>('/tenants/schools/');
      const list = Array.isArray(data) ? data : data.results || [];
      setSchools(list);
      if (preferSchoolId) {
        setSelectedSchoolId(preferSchoolId);
      } else if (list.length > 0) {
        setSelectedSchoolId((prev) =>
          prev && list.some((s) => s.id === prev) ? prev : list[0].id
        );
      }
    } catch (err: any) {
      if (String(err.message).includes('401')) {
        clearAuthSession();
        setAuthUser(null);
      }
    } finally {
      setSchoolsLoading(false);
    }
  };

  const pickDefaultSection = (user: AuthUser): SectionKey => {
    const requested = getSectionFromUrl();
    if (user.role === 'PLATFORM_ADMIN') {
      if (surfaceMode === 'ops') {
        return requested || 'platform_ops';
      }
      if (requested && requested !== 'platform_ops' && requested !== 'onboarding') {
        return requested;
      }
      return 'overview';
    }
    if (!user.school_id) {
      return 'onboarding';
    }
    if (requested && requested !== 'platform_ops' && requested !== 'onboarding') {
      return requested;
    }
    return 'overview';
  };

  const syncSession = async () => {
    const token = getAccessToken();
    const cached = getStoredUser();
    if (!token) {
      setAuthReady(true);
      return;
    }
    if (cached) setAuthUser(cached);

    try {
      const me = await apiJson<AuthUser>('/auth/me/');
      setAuthUser(me);
      updateStoredUser(me);
      setActiveSection(pickDefaultSection(me));
      await loadSchools(me.school_id || undefined);
    } catch {
      clearAuthSession();
      setAuthUser(null);
    } finally {
      setAuthReady(true);
    }
  };

  useEffect(() => {
    syncSession();
  }, []);

  const handleAuthenticated = async (user: AuthUser) => {
    setAuthUser(user);
    setFeedback(null);
    await loadSchools(user.school_id || undefined);
    const nextSection = pickDefaultSection(user);
    setActiveSection(nextSection);
    syncSectionToUrl(nextSection);
  };

  const handleLogout = () => {
    clearAuthSession();
    setAuthUser(null);
    setSchools([]);
    setSelectedSchoolId('');
    setFeedback(null);
    setMobileNavOpen(false);
  };

  const navigateTo = (section: SectionKey) => {
    setActiveSection(section);
    syncSectionToUrl(section);
    setMobileNavOpen(false);
  };

  const selectSchool = (id: string) => {
    setSelectedSchoolId(id);
    setFeedback(null);
  };

  const isPlatformAdmin = authUser?.role === 'PLATFORM_ADMIN';
  const activeSchool = useMemo(
    () => schools.find((s) => s.id === selectedSchoolId) || null,
    [schools, selectedSchoolId]
  );

  const hasSchool = Boolean(authUser?.school_id || selectedSchoolId);
  const erpFeatureEnabled =
    isPlatformAdmin || Boolean(activeSchool?.enable_erp_sync || authUser?.enable_erp_sync);
  const benefitsFeatureEnabled =
    isPlatformAdmin ||
    Boolean(activeSchool?.enable_benefits_club || authUser?.enable_benefits_club);

  const navItems = useMemo(
    () =>
      buildAdminNavItems({
        isPlatformAdmin,
        surfaceMode,
        hasSchool,
        erpFeatureEnabled,
      }),
    [isPlatformAdmin, surfaceMode, hasSchool, erpFeatureEnabled]
  );

  useEffect(() => {
    if (!authReady || !authUser) return;
    if (!navItems.some((item) => item.id === activeSection) && navItems.length > 0) {
      setActiveSection(navItems[0].id);
    }
  }, [authReady, authUser, navItems, activeSection]);

  const effectiveHost = resolveEffectiveHost(activeSchool);
  const isDemoMode = Boolean(activeSchool && !activeSchool.domain);
  const currentNavMeta = navItems.find((i) => i.id === activeSection) || navItems[0];

  return {
    authUser,
    authReady,
    activeSection,
    mobileNavOpen,
    setMobileNavOpen,
    schools,
    schoolsLoading,
    selectedSchoolId,
    activeSchool,
    effectiveHost,
    isDemoMode,
    currentNavMeta,
    feedback,
    setFeedback,
    isPlatformAdmin,
    hasSchool,
    erpFeatureEnabled,
    benefitsFeatureEnabled,
    navItems,
    syncSession,
    loadSchools,
    selectSchool,
    handleAuthenticated,
    handleLogout,
    navigateTo,
  };
}
