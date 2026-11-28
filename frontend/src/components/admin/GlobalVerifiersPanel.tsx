'use client';

import React, { useState } from 'react';
import { Button, Card, DataTable, FormField, Select, StatusBadge, type DataTableColumn } from '@/components/ui';
import { apiJson, type FeedbackState, type GlobalVerifierApp } from './types';

interface GlobalVerifiersPanelProps {
  schoolId: string;
  verifiers: GlobalVerifierApp[];
  loading: boolean;
  fetching?: boolean;
  onSetLoading: (loading: boolean) => void;
  onReload: () => Promise<void>;
  onFeedback: (fb: FeedbackState | null) => void;
}

/** Global student/faculty verifier accreditation packets (SheerID, UNiDAYS, GitHub Education). */
export default function GlobalVerifiersPanel({
  schoolId,
  verifiers,
  loading,
  fetching = false,
  onSetLoading,
  onReload,
  onFeedback,
}: GlobalVerifiersPanelProps) {
  const [verifierType, setVerifierType] = useState<'SHEERID' | 'UNIDAYS' | 'GITHUB_EDUCATION'>(
    'GITHUB_EDUCATION'
  );

  const handleAddVerifier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    onSetLoading(true);
    onFeedback(null);
    try {
      const created = await apiJson<GlobalVerifierApp>('/passport/verifiers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school: schoolId, verifier: verifierType }),
      });
      await apiJson(`/passport/verifiers/${created.id}/prepare-packet/`, { method: 'POST' });
      onFeedback({
        type: 'success',
        message: `Pacote de credenciação preparado para ${verifierType}!`,
      });
      await onReload();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      onSetLoading(false);
    }
  };

  const handlePrepareVerifier = async (id: string) => {
    onSetLoading(true);
    onFeedback(null);
    try {
      await apiJson(`/passport/verifiers/${id}/prepare-packet/`, { method: 'POST' });
      onFeedback({ type: 'success', message: 'Diagnóstico de prontidão atualizado.' });
      await onReload();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      onSetLoading(false);
    }
  };

  const columns: DataTableColumn<GlobalVerifierApp>[] = [
    {
      key: 'verifier',
      header: 'Verificador',
      isRowHeader: true,
      render: (v) => v.verifier,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (v) => (
        <StatusBadge tone={v.status === 'APPROVED' ? 'success' : 'brand'} dot>
          {v.status}
        </StatusBadge>
      ),
    },
    {
      key: 'checklist',
      header: 'Checklist Técnica',
      cellClassName: 'text-xs text-stone-600',
      render: (v) =>
        v.readiness_snapshot?.checks ? (
          <span>
            .edu.ao: {v.readiness_snapshot.checks.official_edu_ao_domain ? 'OK' : 'Pendente'} • DNS:{' '}
            {v.readiness_snapshot.checks.dns_active ? 'Ativo' : 'Pendente'} • APD:{' '}
            {v.readiness_snapshot.checks.apd_notified ? 'OK' : 'Pendente'}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'action',
      header: 'Ação',
      render: (v) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => handlePrepareVerifier(v.id)}
        >
          Reavaliar
        </Button>
      ),
    },
  ];

  return (
    <Card padding="lg" className="space-y-6">
      <div className="border-b border-stone-100 pb-4">
        <h2 id="verifiers-form-heading" className="text-lg font-bold text-stone-900">
          Verificadores Globais (SheerID, UNiDAYS &amp; GitHub Education)
        </h2>
        <p className="text-xs sm:text-sm text-stone-500">
          Prepare o pacote de acreditação institucional (domínio .edu.ao e verificação pública) para
          ativar o GitHub Student Pack, Spotify e Google AI.
        </p>
      </div>

      <form
        onSubmit={handleAddVerifier}
        aria-labelledby="verifiers-form-heading"
        className="flex flex-col sm:flex-row gap-3 items-end"
      >
        <FormField id="verifier-select" label="Plataforma Verificadora" className="flex-1 w-full">
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              name="verifier"
              invalid={invalid}
              aria-describedby={describedBy}
              value={verifierType}
              onChange={(e) => setVerifierType(e.target.value as typeof verifierType)}
            >
              <option value="GITHUB_EDUCATION">GitHub Education Campus (Student Pack)</option>
              <option value="SHEERID">SheerID (Spotify Estudante, Google AI, Autodesk)</option>
              <option value="UNIDAYS">UNiDAYS (Descontos Estudantis Globais)</option>
            </Select>
          )}
        </FormField>
        <Button type="submit" size="lg" disabled={!schoolId} loading={loading}>
          Preparar Pacote de Credenciação
        </Button>
      </form>

      <DataTable
        columns={columns}
        data={verifiers}
        getRowKey={(v) => v.id}
        caption="Estado das candidaturas nos verificadores globais"
        loading={fetching}
        emptyTitle="Nenhuma candidatura iniciada para esta instituição"
      />
    </Card>
  );
}
