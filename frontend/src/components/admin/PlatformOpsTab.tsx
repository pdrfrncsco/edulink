'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui';
import { useIsLocalHost } from '@/lib/useIsLocalHost';
import OpsProfilesTable from './ops/OpsProfilesTable';
import OpsSchoolInspector from './ops/OpsSchoolInspector';
import OpsSchoolsTable from './ops/OpsSchoolsTable';
import {
  AdminUserProfile,
  apiJson,
  FeedbackState,
  OnboardingDocumentItem,
  School,
  SetupStage,
} from './types';

interface PlatformOpsTabProps {
  schools: School[];
  selectedSchoolId: string;
  onSelectSchool: (id: string) => void;
  onOperateSchool: (id: string) => void;
  onSchoolsUpdated: () => void;
  onFeedback: (fb: FeedbackState | null) => void;
}

/** Platform Operator Backoffice orchestrating schools, RBAC accounts, docs, and flags. */
export default function PlatformOpsTab({
  schools,
  selectedSchoolId,
  onSelectSchool,
  onOperateSchool,
  onSchoolsUpdated,
  onFeedback,
}: PlatformOpsTabProps) {
  const isLocalHostBrowser = useIsLocalHost();
  const [profiles, setProfiles] = useState<AdminUserProfile[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<OnboardingDocumentItem[]>([]);

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId) || null;

  const loadProfiles = async () => {
    try {
      const data = await apiJson<{ results?: AdminUserProfile[] } | AdminUserProfile[]>(
        '/auth/profiles/'
      );
      setProfiles(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      onFeedback({
        type: 'error',
        message: err.message || 'Erro ao carregar contas da plataforma.',
      });
    }
  };

  const loadSchoolDocuments = async (schoolIdToLoad: string) => {
    if (!schoolIdToLoad) {
      setDocuments([]);
      return;
    }
    try {
      const docs = await apiJson<OnboardingDocumentItem[]>(
        `/tenants/${schoolIdToLoad}/documents/`
      );
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch {
      setDocuments([]);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      loadSchoolDocuments(selectedSchool.id);
    } else {
      setDocuments([]);
    }
  }, [selectedSchoolId, schools]);

  const handleReviewDocument = async (
    doc: OnboardingDocumentItem,
    decision: 'APPROVED' | 'REJECTED',
    notes: string
  ) => {
    if (!selectedSchool) return;
    setBusyId(doc.id);
    onFeedback(null);
    try {
      await apiJson(`/tenants/${selectedSchool.id}/documents/${doc.id}/review/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: decision, review_notes: notes }),
      });
      onFeedback({
        type: 'success',
        message: `Documento "${doc.doc_type_label}" marcado como ${
          decision === 'APPROVED' ? 'Validado' : 'Rejeitado'
        }.`,
      });
      await loadSchoolDocuments(selectedSchool.id);
      onSchoolsUpdated();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveSchoolPipeline = async (payload: {
    domain: string | null;
    dns_status: SetupStage;
    google_status: SetupStage;
    microsoft_status: SetupStage;
    canva_status: SetupStage;
    enable_erp_sync: boolean;
    enable_benefits_club: boolean;
    enable_online_payments: boolean;
  }) => {
    if (!selectedSchool) return;
    setBusyId(selectedSchool.id);
    onFeedback(null);
    try {
      await apiJson(`/tenants/schools/${selectedSchool.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      onFeedback({
        type: 'success',
        message: `Pipeline, domínio e feature flags de ${selectedSchool.name} atualizados.`,
      });
      onSchoolsUpdated();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleSchoolActive = async (school: School) => {
    setBusyId(school.id);
    onFeedback(null);
    try {
      const res = await apiJson<{ message: string; is_active: boolean }>(
        `/tenants/schools/${school.id}/toggle_active/`,
        { method: 'POST' }
      );
      onFeedback({ type: 'success', message: res.message });
      onSchoolsUpdated();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleUpdateProfile = async (
    profile: AdminUserProfile,
    patch: Partial<{ role: AdminUserProfile['role']; school: string | null; user_is_active: boolean }>
  ) => {
    setBusyId(profile.id);
    onFeedback(null);
    try {
      await apiJson(`/auth/profiles/${profile.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      onFeedback({
        type: 'success',
        message: `Perfil de ${profile.email} atualizado com sucesso.`,
      });
      await loadProfiles();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const activeSchoolsCount = schools.filter((s) => s.is_active).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm">
          <p className="text-xs font-semibold uppercase text-stone-500">Escolas Registadas</p>
          <p className="mt-1 text-2xl font-bold text-stone-900">
            {schools.length}{' '}
            <span className="text-xs font-semibold text-emerald-700">
              ({activeSchoolsCount} ativas)
            </span>
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-semibold uppercase text-stone-500">Contas de Secretaria</p>
          <p className="mt-1 text-2xl font-bold text-stone-900">
            {profiles.filter((p) => p.role === 'SCHOOL_SECRETARY').length}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-semibold uppercase text-stone-500">Administradores Globais</p>
          <p className="mt-1 text-2xl font-bold text-stone-900">
            {profiles.filter((p) => p.role === 'PLATFORM_ADMIN').length}
          </p>
        </Card>
      </div>

      <OpsSchoolsTable
        schools={schools}
        selectedSchoolId={selectedSchoolId}
        isLocalHostBrowser={isLocalHostBrowser}
        busyId={busyId}
        onSelectSchool={onSelectSchool}
        onOperateSchool={onOperateSchool}
        onToggleSchoolActive={handleToggleSchoolActive}
      />

      <OpsProfilesTable
        profiles={profiles}
        schools={schools}
        busyId={busyId}
        onRefresh={loadProfiles}
        onUpdateProfile={handleUpdateProfile}
      />

      {selectedSchool && (
        <OpsSchoolInspector
          selectedSchool={selectedSchool}
          documents={documents}
          busyId={busyId}
          onReviewDocument={handleReviewDocument}
          onSavePipeline={handleSaveSchoolPipeline}
        />
      )}
    </div>
  );
}
