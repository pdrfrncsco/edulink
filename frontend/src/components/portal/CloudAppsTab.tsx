'use client';

import React, { useMemo } from 'react';
import CloudAppList from './apps/CloudAppList';
import GlobalPerksList from './apps/GlobalPerksList';
import InstitutionalEmailCard from './apps/InstitutionalEmailCard';
import {
  buildCloudApps,
  buildGlobalPerks,
  getPersonaContextMeta,
  isPreviewDemoDomain,
} from './cloudAppsCatalog';
import type { PassportData } from './types';

interface CloudAppsTabProps {
  passport: PassportData;
  isTeacher?: boolean;
  isSuspended: boolean;
  isOffline?: boolean;
  isTokenExpired?: boolean;
  onSync?: () => void;
}

/**
 * Institutional cloud apps & global perks panel tailored for:
 * Student vs. Teacher and MED (K-12) vs. MESCTI (Higher Ed), with safe offline mode and 360px layout.
 */
export default function CloudAppsTab({
  passport,
  isTeacher: isTeacherProp,
  isSuspended,
  isOffline = false,
  isTokenExpired = false,
  onSync,
}: CloudAppsTabProps) {
  const isTeacher = isTeacherProp ?? passport.role === 'TEACHER';
  const isHigherEd = passport.institutionType === 'MESCTI_HIGHER_ED';
  const isCanvaFreeK12 = !isHigherEd;
  const isDemoDomain = isPreviewDemoDomain(passport.schoolDomain);
  const domainSuffix = passport.schoolDomain.split('.').slice(-2).join('.');

  const personaMeta = useMemo(
    () => getPersonaContextMeta(isTeacher, isHigherEd),
    [isTeacher, isHigherEd]
  );

  const cloudApps = useMemo(
    () => buildCloudApps(passport, isTeacher, isCanvaFreeK12),
    [passport, isTeacher, isCanvaFreeK12]
  );

  const globalPerks = useMemo(
    () => buildGlobalPerks(isTeacher, passport.institutionType),
    [isTeacher, passport.institutionType]
  );

  return (
    <div className="space-y-4">
      <InstitutionalEmailCard
        institutionalEmail={passport.institutionalEmail}
        schoolName={passport.schoolName}
        personaMeta={personaMeta}
        isSuspended={isSuspended}
        isOffline={isOffline}
        isTokenExpired={isTokenExpired}
        isDemoDomain={isDemoDomain}
        onSync={onSync}
      />

      <CloudAppList
        title={personaMeta.appsSectionTitle}
        apps={cloudApps}
        isSuspended={isSuspended}
        isOffline={isOffline}
        isDemoDomain={isDemoDomain}
      />

      <GlobalPerksList
        title={personaMeta.perksSectionTitle}
        domainSuffix={domainSuffix}
        perks={globalPerks}
        isSuspended={isSuspended}
        isOffline={isOffline}
        isDemoDomain={isDemoDomain}
      />
    </div>
  );
}
