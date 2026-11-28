'use client';

import React from 'react';
import type { AuthUser } from '@/lib/auth';
import BillingAndBenefitsTab from './BillingAndBenefitsTab';
import ComplianceAPDTab from './ComplianceAPDTab';
import DirectoryTab from './DirectoryTab';
import DomainsDNSTab from './DomainsDNSTab';
import ERPAndVerifiersTab from './ERPAndVerifiersTab';
import OnboardingTab from './OnboardingTab';
import PlatformOpsTab from './PlatformOpsTab';
import ProvisioningTab from './ProvisioningTab';
import SchoolOverviewPanel from './SchoolOverviewPanel';
import type { SectionKey } from './navigation';
import type { FeedbackState, School } from './types';

interface AdminSectionContentProps {
  activeSection: SectionKey;
  surfaceMode: 'admin' | 'ops';
  authUser: AuthUser;
  isPlatformAdmin: boolean;
  erpFeatureEnabled: boolean;
  benefitsFeatureEnabled: boolean;
  schools: School[];
  schoolsLoading: boolean;
  selectedSchoolId: string;
  activeSchool: School | null;
  onSelectSchool: (id: string) => void;
  onNavigate: (section: SectionKey) => void;
  onLoadSchools: (preferSchoolId?: string) => Promise<void>;
  onFeedback: (fb: FeedbackState | null) => void;
}

/** Renders the active workspace section for `/admin` or `/ops`. */
export default function AdminSectionContent({
  activeSection,
  surfaceMode,
  authUser,
  isPlatformAdmin,
  erpFeatureEnabled,
  benefitsFeatureEnabled,
  schools,
  schoolsLoading,
  selectedSchoolId,
  activeSchool,
  onSelectSchool,
  onNavigate,
  onLoadSchools,
  onFeedback,
}: AdminSectionContentProps) {
  const isOpsMode = isPlatformAdmin && surfaceMode === 'ops';

  switch (activeSection) {
    case 'overview':
      return (
        <SchoolOverviewPanel
          activeSchool={activeSchool}
          isPlatformAdmin={isOpsMode}
          onNavigate={onNavigate}
        />
      );
    case 'platform_ops':
      return isOpsMode ? (
        <PlatformOpsTab
          schools={schools}
          schoolsLoading={schoolsLoading}
          selectedSchoolId={selectedSchoolId}
          onSelectSchool={onSelectSchool}
          onOperateSchool={() => onNavigate('overview')}
          onSchoolsUpdated={() => onLoadSchools(selectedSchoolId)}
          onFeedback={onFeedback}
        />
      ) : null;
    case 'onboarding':
      return isOpsMode ? (
        <OnboardingTab
          onSchoolCreated={async (id) => {
            await onLoadSchools(id);
            onNavigate('overview');
          }}
          onFeedback={onFeedback}
        />
      ) : null;
    case 'directory':
      return (
        <DirectoryTab
          schoolId={selectedSchoolId}
          onFeedback={onFeedback}
          onDirectoryUpdated={() => onLoadSchools(selectedSchoolId)}
        />
      );
    case 'provisioning':
      return <ProvisioningTab schoolId={selectedSchoolId} onFeedback={onFeedback} />;
    case 'domains':
      return (
        <DomainsDNSTab
          schoolId={selectedSchoolId}
          hasOfficialDomain={Boolean(activeSchool?.domain)}
          onFeedback={onFeedback}
        />
      );
    case 'compliance':
      return (
        <ComplianceAPDTab
          schoolId={selectedSchoolId}
          onFeedback={onFeedback}
          onSchoolUpdated={() => onLoadSchools(selectedSchoolId)}
        />
      );
    case 'erp_verifiers':
      return erpFeatureEnabled ? (
        <ERPAndVerifiersTab
          schoolId={selectedSchoolId}
          onFeedback={onFeedback}
          onDirectoryUpdated={() => onLoadSchools(selectedSchoolId)}
        />
      ) : null;
    case 'billing_benefits':
      return (
        <BillingAndBenefitsTab
          schoolId={selectedSchoolId}
          userRole={surfaceMode === 'ops' ? authUser.role : 'SCHOOL_SECRETARY'}
          onFeedback={onFeedback}
          enableBenefitsClub={benefitsFeatureEnabled}
        />
      );
    default:
      return null;
  }
}
