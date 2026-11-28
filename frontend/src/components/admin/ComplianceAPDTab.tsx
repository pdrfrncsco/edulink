'use client';

import React, { useEffect, useState } from 'react';
import { Card, StatusBadge } from '@/components/ui';
import { openProtectedHtml } from '@/lib/auth';
import APDDossierForm from './compliance/APDDossierForm';
import APDProtocolCard from './compliance/APDProtocolCard';
import ParentalConsentsPanel from './ParentalConsentsPanel';
import { apiJson, type APDDossier, type FeedbackState, type ParentalConsent } from './types';

interface ComplianceAPDTabProps {
  schoolId: string;
  onFeedback: (fb: FeedbackState | null) => void;
  onSchoolUpdated: () => void;
}

/** APD Lei n.º 22/11 regulatory dossier builder and parental consent orchestrator. */
export default function ComplianceAPDTab({
  schoolId,
  onFeedback,
  onSchoolUpdated,
}: ComplianceAPDTabProps) {
  const [dossier, setDossier] = useState<APDDossier | null>(null);
  const [consents, setConsents] = useState<ParentalConsent[]>([]);
  const [directorName, setDirectorName] = useState('');
  const [directorBi, setDirectorBi] = useState('');
  const [dpoName, setDpoName] = useState('');
  const [dpoEmail, setDpoEmail] = useState('');
  const [institutionType, setInstitutionType] = useState<'PRIMARY_SECONDARY' | 'HIGHER_ED'>(
    'PRIMARY_SECONDARY'
  );
  const [hasMinors, setHasMinors] = useState(true);
  const [apdRefNumber, setApdRefNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(Boolean(schoolId));

  const resetDossierFields = () => {
    setDirectorName('');
    setDirectorBi('');
    setDpoName('');
    setDpoEmail('');
    setInstitutionType('PRIMARY_SECONDARY');
    setHasMinors(true);
    setApdRefNumber('');
  };

  const loadCompliance = async () => {
    if (!schoolId) {
      setDossier(null);
      setConsents([]);
      resetDossierFields();
      setFetching(false);
      return;
    }
    setFetching(true);
    try {
      const [dosData, conData] = await Promise.all([
        apiJson<{ results: APDDossier[] }>(`/compliance/dossiers/?school=${schoolId}`),
        apiJson<{ results: ParentalConsent[] }>(`/compliance/consents/?school=${schoolId}`),
      ]);
      const first = (dosData.results || [])[0] || null;
      setDossier(first);
      if (first) {
        setDirectorName(first.director_full_name || '');
        setDirectorBi(first.director_bi || '');
        setDpoName(first.dpo_name || '');
        setDpoEmail(first.dpo_email || '');
        setInstitutionType(first.institution_type);
        setHasMinors(first.has_minors);
        setApdRefNumber(first.apd_reference_number || '');
      } else {
        resetDossierFields();
      }
      setConsents(conData.results || []);
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadCompliance();
  }, [schoolId]);

  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    setLoading(true);
    onFeedback(null);

    const payload = {
      school: schoolId,
      director_full_name: directorName,
      director_bi: directorBi,
      dpo_name: dpoName,
      dpo_email: dpoEmail,
      institution_type: institutionType,
      has_minors: hasMinors,
    };

    try {
      if (dossier) {
        const updated = await apiJson<APDDossier>(`/compliance/dossiers/${dossier.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setDossier(updated);
      } else {
        const created = await apiJson<APDDossier>('/compliance/dossiers/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setDossier(created);
      }
      onFeedback({ type: 'success', message: 'Dados do Dossiê APD guardados com sucesso!' });
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDossier = async () => {
    if (!dossier) return;
    setLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson<{ submission_type: string }>(
        `/compliance/dossiers/${dossier.id}/generate/`,
        { method: 'POST' }
      );
      onFeedback({
        type: 'success',
        message: `Dossiê APD gerado (${res.submission_type}) — pronto para protocolo!`,
      });
      await loadCompliance();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSubmitted = async () => {
    if (!dossier || !apdRefNumber.trim()) {
      onFeedback({
        type: 'error',
        message: 'Introduza o N.º de Processo da APD antes de confirmar.',
      });
      return;
    }
    setLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson<{ message: string }>(
        `/compliance/dossiers/${dossier.id}/mark-submitted/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apd_reference_number: apdRefNumber.trim(), approved: true }),
        }
      );
      onFeedback({ type: 'success', message: res.message });
      await loadCompliance();
      onSchoolUpdated();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card padding="lg" className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h2 id="apd-form-heading" className="text-lg font-bold text-stone-900">
              Conformidade Legal APD (Lei n.º 22/11)
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Instrução automática do dossiê de notificação/autorização prévia perante a Agência de
              Protecção de Dados.
            </p>
          </div>
          {dossier && (
            <StatusBadge
              tone={
                dossier.status === 'APPROVED' || dossier.status === 'SUBMITTED'
                  ? 'success'
                  : 'warning'
              }
              size="md"
              className="self-start"
            >
              {dossier.status} • {dossier.submission_type}
            </StatusBadge>
          )}
        </div>

        <APDDossierForm
          schoolId={schoolId}
          dossier={dossier}
          directorName={directorName}
          directorBi={directorBi}
          dpoName={dpoName}
          dpoEmail={dpoEmail}
          institutionType={institutionType}
          hasMinors={hasMinors}
          loading={loading}
          onChangeDirectorName={setDirectorName}
          onChangeDirectorBi={setDirectorBi}
          onChangeDpoName={setDpoName}
          onChangeDpoEmail={setDpoEmail}
          onChangeInstitutionType={setInstitutionType}
          onChangeHasMinors={setHasMinors}
          onSubmit={handleSaveDossier}
          onGenerateDossier={handleGenerateDossier}
          onOpenHtml={() => {
            if (!dossier) return;
            openProtectedHtml(`/compliance/dossiers/${dossier.id}/download-html/`).catch((err) =>
              onFeedback({ type: 'error', message: err.message })
            );
          }}
        />

        {dossier && (
          <APDProtocolCard
            apdRefNumber={apdRefNumber}
            loading={loading}
            onChangeRefNumber={setApdRefNumber}
            onConfirmSubmitted={handleMarkSubmitted}
          />
        )}
      </Card>

      <ParentalConsentsPanel
        schoolId={schoolId}
        consents={consents}
        loading={loading}
        fetching={fetching}
        onSetLoading={setLoading}
        onReload={loadCompliance}
        onFeedback={onFeedback}
      />
    </div>
  );
}
