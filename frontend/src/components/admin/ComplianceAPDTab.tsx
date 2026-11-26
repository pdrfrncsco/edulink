'use client';

import React, { useEffect, useState } from 'react';
import { openProtectedHtml } from '@/lib/auth';
import { APDDossier, apiJson, FeedbackState, ParentalConsent } from './types';

interface ComplianceAPDTabProps {
  schoolId: string;
  onFeedback: (fb: FeedbackState | null) => void;
  onSchoolUpdated: () => void;
}

export default function ComplianceAPDTab({ schoolId, onFeedback, onSchoolUpdated }: ComplianceAPDTabProps) {
  const [dossier, setDossier] = useState<APDDossier | null>(null);
  const [consents, setConsents] = useState<ParentalConsent[]>([]);
  const [directorName, setDirectorName] = useState('');
  const [directorBi, setDirectorBi] = useState('');
  const [dpoName, setDpoName] = useState('');
  const [dpoEmail, setDpoEmail] = useState('');
  const [institutionType, setInstitutionType] = useState<'PRIMARY_SECONDARY' | 'HIGHER_ED'>('PRIMARY_SECONDARY');
  const [hasMinors, setHasMinors] = useState(true);
  const [apdRefNumber, setApdRefNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailPromptId, setEmailPromptId] = useState<string | null>(null);
  const [guardianEmailInput, setGuardianEmailInput] = useState('');

  const loadCompliance = async () => {
    if (!schoolId) {
      setDossier(null);
      setConsents([]);
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
      const res = await apiJson(`/compliance/dossiers/${dossier.id}/generate/`, { method: 'POST' });
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
      onFeedback({ type: 'error', message: 'Introduza o N.º de Processo da APD antes de confirmar.' });
      return;
    }
    setLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson(`/compliance/dossiers/${dossier.id}/mark-submitted/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apd_reference_number: apdRefNumber.trim(), approved: true }),
      });
      onFeedback({ type: 'success', message: res.message });
      await loadCompliance();
      onSchoolUpdated();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkConsents = async () => {
    if (!schoolId) return;
    setLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson('/compliance/consents/bulk-generate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId }),
      });
      onFeedback({
        type: 'success',
        message: `Termos gerados: ${res.created} novos (${res.existing} já existentes).`,
      });
      await loadCompliance();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeConsent = async (consentId: string) => {
    onFeedback(null);
    try {
      await apiJson(`/compliance/consents/${consentId}/revoke/`, { method: 'POST' });
      onFeedback({ type: 'success', message: 'Consentimento parental revogado.' });
      await loadCompliance();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    }
  };

  const handleSendConsentEmail = async (consentId: string, overrideEmail?: string) => {
    setLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson<{ message: string }>(`/compliance/consents/${consentId}/send-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(overrideEmail ? { guardian_email: overrideEmail.trim() } : {}),
      });
      setEmailPromptId(null);
      setGuardianEmailInput('');
      onFeedback({ type: 'success', message: res.message });
      await loadCompliance();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSendConsentEmails = async () => {
    if (!schoolId) return;
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* APD Dossier Form */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h2 id="apd-form-heading" className="text-lg font-bold text-stone-900">
              Blindagem Regulatória APD — Lei n.º 22/11 (Angola)
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Instrução automática do dossiê de notificação/autorização prévia perante a Agência de Protecção de Dados.
            </p>
          </div>
          {dossier && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 self-start">
              {dossier.status} • {dossier.submission_type}
            </span>
          )}
        </div>

        <form onSubmit={handleSaveDossier} aria-labelledby="apd-form-heading" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="apd-director-name" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              Nome do Diretor / Representante Legal <span aria-hidden="true">*</span>
            </label>
            <input
              id="apd-director-name"
              name="director_full_name"
              type="text"
              required
              value={directorName}
              onChange={(e) => setDirectorName(e.target.value)}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
            />
          </div>
          <div>
            <label htmlFor="apd-director-bi" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              BI do Diretor <span aria-hidden="true">*</span>
            </label>
            <input
              id="apd-director-bi"
              name="director_bi"
              type="text"
              required
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={directorBi}
              onChange={(e) => setDirectorBi(e.target.value)}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono"
            />
          </div>

          <div>
            <label htmlFor="apd-dpo-name" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              Ponto Focal de Privacidade (opcional)
            </label>
            <input
              id="apd-dpo-name"
              name="dpo_name"
              type="text"
              value={dpoName}
              onChange={(e) => setDpoName(e.target.value)}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
            />
          </div>
          <div>
            <label htmlFor="apd-dpo-email" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              E-mail de Privacidade / APD
            </label>
            <input
              id="apd-dpo-email"
              name="dpo_email"
              type="email"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={dpoEmail}
              onChange={(e) => setDpoEmail(e.target.value)}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
            />
          </div>

          <div>
            <label htmlFor="apd-inst-type" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
              Nível de Ensino
            </label>
            <select
              id="apd-inst-type"
              name="institution_type"
              value={institutionType}
              onChange={(e) => setInstitutionType(e.target.value as 'PRIMARY_SECONDARY' | 'HIGHER_ED')}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm bg-white"
            >
              <option value="PRIMARY_SECONDARY">Ensino Primário / Secundário (Menores)</option>
              <option value="HIGHER_ED">Ensino Superior / Técnico (IES)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="apd-has-minors"
              name="has_minors"
              type="checkbox"
              checked={hasMinors}
              onChange={(e) => setHasMinors(e.target.checked)}
              className="accent-teal-700 w-4 h-4"
            />
            <label htmlFor="apd-has-minors" className="text-sm text-stone-700">
              Trata dados de menores de idade (exige Consentimento Parental)
            </label>
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-2 justify-between items-center pt-2">
            <div className="flex flex-wrap gap-2">
              {dossier && (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleGenerateDossier}
                    className="px-4 py-2.5 rounded-xl border border-teal-300 bg-teal-50 text-teal-800 text-xs font-semibold hover:bg-teal-100"
                  >
                    Gerar / Atualizar Dossiê APD
                  </button>
                  <button
                    type="button"
                    onClick={() => openProtectedHtml(`/compliance/dossiers/${dossier.id}/download-html/`).catch((err) => onFeedback({ type: 'error', message: err.message }))}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-100"
                  >
                    Imprimir / Ver HTML Oficial
                  </button>
                </>
              )}
            </div>
            <button
              type="submit"
              disabled={!schoolId || loading}
              className="px-5 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 disabled:opacity-50"
            >
              {dossier ? 'Atualizar Dados APD' : 'Criar Dossiê APD'}
            </button>
          </div>
        </form>

        {dossier && (
          <div className="border-t border-stone-100 pt-4 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label htmlFor="apd-ref-number" className="block text-xs font-semibold uppercase text-stone-700 mb-1">
                Registar N.º de Processo Protocolado na APD
              </label>
              <input
                id="apd-ref-number"
                name="apd_reference_number"
                type="text"
                placeholder="Ex: APD-PROC-2026-0412"
                value={apdRefNumber}
                onChange={(e) => setApdRefNumber(e.target.value)}
                className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm font-mono"
              />
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleMarkSubmitted}
              className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs sm:text-sm font-semibold hover:bg-amber-700 whitespace-nowrap"
            >
              Confirmar Submissão à APD
            </button>
          </div>
        )}
      </div>

      {/* Parental Consents Table */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 id="consents-table-caption" className="text-base font-bold text-stone-900">
              Termos de Consentimento Parental ({consents.length})
            </h3>
            <p className="text-xs text-stone-500">
              Envie o link de assinatura digital ao Encarregado de Educação ou imprima o termo em HTML.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!schoolId || loading}
              onClick={handleBulkConsents}
              className="px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50"
            >
              Gerar Termos em Lote (Estudantes)
            </button>
            <button
              type="button"
              disabled={!schoolId || loading || consents.length === 0}
              onClick={handleBulkSendConsentEmails}
              className="px-4 py-2.5 rounded-xl border border-teal-700 bg-white text-teal-800 text-xs font-semibold hover:bg-teal-50 disabled:opacity-50"
            >
              Enviar E-mails Pendentes
            </button>
          </div>
        </div>

        <div tabIndex={0} role="region" aria-labelledby="consents-table-caption" className="table-wrapper">
          <table className="edulink-table text-xs sm:text-sm">
            <caption className="sr-only">Lista de termos de consentimento parental</caption>
            <thead>
              <tr className="text-xs uppercase text-stone-600 border-b border-stone-200">
                <th className="p-3 font-semibold">Estudante</th>
                <th className="p-3 font-semibold">Encarregado</th>
                <th className="p-3 font-semibold">Estado</th>
                <th className="p-3 font-semibold">Link Assinatura</th>
                <th className="p-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {consents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-stone-500">
                    Nenhum termo gerado ainda. Clique em &quot;Gerar Termos em Lote&quot;.
                  </td>
                </tr>
              ) : (
                consents.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/70">
                    <th scope="row" className="p-3 font-semibold text-stone-900">
                      {c.student_name}
                      <span className="block text-[11px] font-mono font-normal text-stone-500">{c.student_email}</span>
                    </th>
                    <td data-label="Encarregado" className="p-3 text-xs text-stone-700">
                      {c.guardian_full_name ? `${c.guardian_full_name} (BI: ${c.guardian_bi})` : 'Aguardando encarregado'}
                    </td>
                    <td data-label="Estado" className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          c.status === 'SIGNED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'REVOKED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td data-label="Link Assinatura" className="p-3 text-xs">
                      <a
                        href={`/consent?token=${encodeURIComponent(c.consent_token)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-700 underline font-semibold"
                      >
                        Abrir Formulário
                      </a>
                    </td>
                    <td data-label="Ações" className="p-3 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openProtectedHtml(`/compliance/consents/${c.id}/download-html/`).catch((err) => onFeedback({ type: 'error', message: err.message }))}
                          className="px-2.5 py-1 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                        >
                          HTML
                        </button>
                        {c.status === 'PENDING' && (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => {
                              if (c.guardian_email) {
                                handleSendConsentEmail(c.id);
                              } else {
                                setEmailPromptId(emailPromptId === c.id ? null : c.id);
                                setGuardianEmailInput('');
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg border border-teal-300 bg-teal-50 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                          >
                            Enviar E-mail
                          </button>
                        )}
                        {c.status !== 'REVOKED' && (
                          <button
                            type="button"
                            onClick={() => handleRevokeConsent(c.id)}
                            className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Revogar
                          </button>
                        )}
                      </div>
                      {emailPromptId === c.id && (
                        <div className="flex flex-wrap gap-1.5 items-center pt-1">
                          <label htmlFor={`guardian-email-${c.id}`} className="sr-only">
                            E-mail do Encarregado
                          </label>
                          <input
                            id={`guardian-email-${c.id}`}
                            type="email"
                            placeholder="encarregado@email.ao"
                            value={guardianEmailInput}
                            onChange={(e) => setGuardianEmailInput(e.target.value)}
                            className="edulink-input px-2 py-1 text-xs rounded-lg border border-stone-300"
                          />
                          <button
                            type="button"
                            disabled={loading || !guardianEmailInput.trim()}
                            onClick={() => handleSendConsentEmail(c.id, guardianEmailInput)}
                            className="px-2.5 py-1 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50"
                          >
                            Enviar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
