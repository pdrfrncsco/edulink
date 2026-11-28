'use client';

import React, { useEffect, useState } from 'react';
import { Button, Card, FormField, Input, Select, StatusBadge } from '@/components/ui';
import { openProtectedHtml } from '@/lib/auth';
import ParentalConsentsPanel from './ParentalConsentsPanel';
import { APDDossier, apiJson, FeedbackState, ParentalConsent } from './types';

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
      return;
    }
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
              Blindagem Regulatória APD — Lei n.º 22/11 (Angola)
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Instrução automática do dossiê de notificação/autorização prévia perante a Agência de
              Protecção de Dados.
            </p>
          </div>
          {dossier && (
            <StatusBadge
              tone={dossier.status === 'APPROVED' || dossier.status === 'SUBMITTED' ? 'success' : 'warning'}
              size="md"
              className="self-start"
            >
              {dossier.status} • {dossier.submission_type}
            </StatusBadge>
          )}
        </div>

        <form
          onSubmit={handleSaveDossier}
          aria-labelledby="apd-form-heading"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <FormField id="apd-director-name" label="Nome do Diretor / Representante Legal" required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="director_full_name"
                type="text"
                required
                invalid={invalid}
                aria-describedby={describedBy}
                autoComplete="name"
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="apd-director-bi" label="BI do Diretor" required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="director_bi"
                type="text"
                required
                mono
                invalid={invalid}
                aria-describedby={describedBy}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={directorBi}
                onChange={(e) => setDirectorBi(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="apd-dpo-name" label="Ponto Focal de Privacidade (opcional)">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="dpo_name"
                type="text"
                invalid={invalid}
                aria-describedby={describedBy}
                value={dpoName}
                onChange={(e) => setDpoName(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="apd-dpo-email" label="E-mail de Privacidade / APD">
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="dpo_email"
                type="email"
                invalid={invalid}
                aria-describedby={describedBy}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={dpoEmail}
                onChange={(e) => setDpoEmail(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="apd-inst-type" label="Nível de Ensino">
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                name="institution_type"
                invalid={invalid}
                aria-describedby={describedBy}
                value={institutionType}
                onChange={(e) =>
                  setInstitutionType(e.target.value as 'PRIMARY_SECONDARY' | 'HIGHER_ED')
                }
              >
                <option value="PRIMARY_SECONDARY">Ensino Primário / Secundário (Menores)</option>
                <option value="HIGHER_ED">Ensino Superior / Técnico (IES)</option>
              </Select>
            )}
          </FormField>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="apd-has-minors"
              name="has_minors"
              type="checkbox"
              checked={hasMinors}
              onChange={(e) => setHasMinors(e.target.checked)}
              className="accent-teal-700 w-4 h-4"
            />
            <label htmlFor="apd-has-minors" className="text-sm text-stone-700 cursor-pointer">
              Trata dados de menores de idade (exige Consentimento Parental)
            </label>
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-2 justify-between items-center pt-2">
            <div className="flex flex-wrap gap-2">
              {dossier && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={handleGenerateDossier}
                  >
                    Gerar / Atualizar Dossiê APD
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      openProtectedHtml(`/compliance/dossiers/${dossier.id}/download-html/`).catch(
                        (err) => onFeedback({ type: 'error', message: err.message })
                      )
                    }
                  >
                    Imprimir / Ver HTML Oficial
                  </Button>
                </>
              )}
            </div>
            <Button type="submit" disabled={!schoolId} loading={loading}>
              {dossier ? 'Atualizar Dados APD' : 'Criar Dossiê APD'}
            </Button>
          </div>
        </form>

        {dossier && (
          <div className="border-t border-stone-100 pt-4 flex flex-col sm:flex-row gap-3 items-end">
            <FormField
              id="apd-ref-number"
              label="Registar N.º de Processo Protocolado na APD"
              className="flex-1 w-full"
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="apd_reference_number"
                  type="text"
                  mono
                  invalid={invalid}
                  aria-describedby={describedBy}
                  placeholder="Ex: APD-PROC-2026-0412"
                  value={apdRefNumber}
                  onChange={(e) => setApdRefNumber(e.target.value)}
                />
              )}
            </FormField>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={handleMarkSubmitted}
            >
              Confirmar Submissão à APD
            </Button>
          </div>
        )}
      </Card>

      <ParentalConsentsPanel
        schoolId={schoolId}
        consents={consents}
        loading={loading}
        onSetLoading={setLoading}
        onReload={loadCompliance}
        onFeedback={onFeedback}
      />
    </div>
  );
}
