'use client';

import React, { useState } from 'react';
import { ExternalLink, FileText, Mail } from 'lucide-react';
import {
  Button,
  Card,
  ConfirmModal,
  CopyButton,
  DataTable,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui';
import { openProtectedHtml } from '@/lib/auth';
import ConsentRowActions from './compliance/ConsentRowActions';
import { apiJson, type FeedbackState, type ParentalConsent } from './types';

interface ParentalConsentsPanelProps {
  schoolId: string;
  consents: ParentalConsent[];
  loading: boolean;
  fetching?: boolean;
  onSetLoading: (loading: boolean) => void;
  onReload: () => Promise<void>;
  onFeedback: (fb: FeedbackState | null) => void;
}

/** Parental consent records table with bulk generation, email dispatch, and revoke confirmation. */
export default function ParentalConsentsPanel({
  schoolId,
  consents,
  loading,
  fetching = false,
  onSetLoading,
  onReload,
  onFeedback,
}: ParentalConsentsPanelProps) {
  const [emailPromptId, setEmailPromptId] = useState<string | null>(null);
  const [guardianEmailInput, setGuardianEmailInput] = useState('');
  const [confirmRevokeConsent, setConfirmRevokeConsent] = useState<ParentalConsent | null>(null);

  const handleBulkConsents = async () => {
    if (!schoolId) return;
    onSetLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson<{ created: number; existing: number }>(
        '/compliance/consents/bulk-generate/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ school_id: schoolId }),
        }
      );
      onFeedback({
        type: 'success',
        message: `Termos gerados: ${res.created} novos (${res.existing} já existentes).`,
      });
      await onReload();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      onSetLoading(false);
    }
  };

  const executeRevokeConsent = async (consent: ParentalConsent) => {
    onSetLoading(true);
    onFeedback(null);
    try {
      await apiJson(`/compliance/consents/${consent.id}/revoke/`, { method: 'POST' });
      onFeedback({
        type: 'success',
        message: `Consentimento parental de ${consent.student_name} revogado.`,
      });
      setConfirmRevokeConsent(null);
      await onReload();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      onSetLoading(false);
    }
  };

  const handleSendConsentEmail = async (consentId: string, overrideEmail?: string) => {
    onSetLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson<{ message: string }>(
        `/compliance/consents/${consentId}/send-email/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(overrideEmail ? { guardian_email: overrideEmail.trim() } : {}),
        }
      );
      setEmailPromptId(null);
      setGuardianEmailInput('');
      onFeedback({ type: 'success', message: res.message });
      await onReload();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      onSetLoading(false);
    }
  };

  const handleBulkSendConsentEmails = async () => {
    if (!schoolId) return;
    onSetLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson<{ sent: number; skipped_without_email: number }>(
        '/compliance/consents/send-bulk-emails/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ school_id: schoolId }),
        }
      );
      onFeedback({
        type: 'success',
        message: `E-mails enviados: ${res.sent} (${res.skipped_without_email} sem e-mail de encarregado definido).`,
      });
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      onSetLoading(false);
    }
  };

  const columns: DataTableColumn<ParentalConsent>[] = [
    {
      key: 'student',
      header: 'Estudante',
      isRowHeader: true,
      render: (c) => (
        <div>
          <span className="font-semibold text-stone-900 block">{c.student_name}</span>
          <span className="block text-[11px] font-mono font-normal text-stone-500">
            {c.student_email}
          </span>
        </div>
      ),
    },
    {
      key: 'guardian',
      header: 'Encarregado',
      cellClassName: 'text-xs',
      render: (c) =>
        c.guardian_full_name
          ? `${c.guardian_full_name} (BI: ${c.guardian_bi})`
          : 'Aguardando encarregado',
    },
    {
      key: 'status',
      header: 'Estado',
      render: (c) => (
        <StatusBadge
          tone={c.status === 'SIGNED' ? 'success' : c.status === 'REVOKED' ? 'error' : 'warning'}
          dot
        >
          {c.status === 'SIGNED' ? 'Assinado' : c.status === 'REVOKED' ? 'Revogado' : 'Pendente'}
        </StatusBadge>
      ),
    },
    {
      key: 'link',
      header: 'Link Assinatura',
      render: (c) => {
        const href = `/consent?token=${encodeURIComponent(c.consent_token)}`;
        const fullUrl =
          typeof window !== 'undefined' ? `${window.location.origin}${href}` : href;
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-teal-700 underline text-xs font-semibold"
            >
              <span>Abrir</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            <CopyButton value={fullUrl} label="Copiar" copiedLabel="Copiado" size="sm" />
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (c) => (
        <ConsentRowActions
          consent={c}
          loading={loading}
          isPromptOpen={emailPromptId === c.id}
          guardianEmailInput={guardianEmailInput}
          onOpenHtml={(item) =>
            openProtectedHtml(`/compliance/consents/${item.id}/download-html/`).catch((err) =>
              onFeedback({ type: 'error', message: err.message })
            )
          }
          onSendEmail={handleSendConsentEmail}
          onToggleEmailPrompt={(id) => {
            setEmailPromptId(emailPromptId === id ? null : id);
            setGuardianEmailInput('');
          }}
          onChangeEmailInput={setGuardianEmailInput}
          onRequestRevoke={setConfirmRevokeConsent}
        />
      ),
    },
  ];

  return (
    <Card padding="lg" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 id="consents-table-caption" className="text-base font-bold text-stone-900">
            Termos de Consentimento Parental ({consents.length})
          </h3>
          <p className="text-xs text-stone-500">
            Envie o link de assinatura digital ao Encarregado de Educação ou imprima o termo em
            HTML.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!schoolId || loading}
            onClick={handleBulkConsents}
            leftIcon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Gerar Termos em Lote (Estudantes)
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!schoolId || loading || consents.length === 0}
            onClick={handleBulkSendConsentEmails}
            leftIcon={<Mail className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Enviar E-mails Pendentes
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={consents}
        getRowKey={(c) => c.id}
        caption="Lista de termos de consentimento parental"
        labelledBy="consents-table-caption"
        loading={fetching}
        emptyTitle="Nenhum termo gerado ainda"
        emptyDescription='Clique em "Gerar Termos em Lote" para criar autorizações parentais para os estudantes.'
      />

      <ConfirmModal
        open={Boolean(confirmRevokeConsent)}
        onClose={() => setConfirmRevokeConsent(null)}
        onConfirm={() => {
          if (confirmRevokeConsent) executeRevokeConsent(confirmRevokeConsent);
        }}
        destructive
        loading={loading}
        title={`Revogar consentimento de ${confirmRevokeConsent?.student_name}?`}
        description="A revogação invalida permanentemente o termo assinado e exige emissão de novo termo caso o encarregado volte a autorizar."
        confirmLabel="Revogar Consentimento"
      />
    </Card>
  );
}
