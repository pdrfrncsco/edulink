'use client';

import React, { useEffect, useState } from 'react';
import { buildSchoolSiteHref, getDisplayRootDomain } from '@/lib/siteUrls';
import { useIsLocalHost } from '@/lib/useIsLocalHost';
import {
  AdminUserProfile,
  apiJson,
  FeedbackState,
  OnboardingDocumentItem,
  School,
  SetupStage,
} from './types';

const STAGE_OPTIONS: { value: SetupStage; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Por Iniciar' },
  { value: 'PENDING_DOCS', label: 'Aguardando Docs' },
  { value: 'SUBMITTED', label: 'Submetido / Em Revisão' },
  { value: 'APPROVED', label: 'Aprovado / Ativo' },
  { value: 'ACTION_REQUIRED', label: 'Ação Necessária' },
  { value: 'NOT_ELIGIBLE', label: 'Não Elegível (Pago)' },
];

interface PlatformOpsTabProps {
  schools: School[];
  selectedSchoolId: string;
  onSelectSchool: (id: string) => void;
  onOperateSchool: (id: string) => void;
  onSchoolsUpdated: () => void;
  onFeedback: (fb: FeedbackState | null) => void;
}

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
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [officialDomain, setOfficialDomain] = useState('');
  const [dnsStatus, setDnsStatus] = useState<SetupStage>('NOT_STARTED');
  const [googleStatus, setGoogleStatus] = useState<SetupStage>('NOT_STARTED');
  const [microsoftStatus, setMicrosoftStatus] = useState<SetupStage>('NOT_STARTED');
  const [canvaStatus, setCanvaStatus] = useState<SetupStage>('NOT_STARTED');
  const [flagErp, setFlagErp] = useState(false);
  const [flagBenefits, setFlagBenefits] = useState(false);
  const [flagPayments, setFlagPayments] = useState(false);

  const selectedSchool = schools.find((s) => s.id === selectedSchoolId) || null;

  const loadProfiles = async () => {
    try {
      const data = await apiJson<{ results?: AdminUserProfile[] } | AdminUserProfile[]>('/auth/profiles/');
      setProfiles(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message || 'Erro ao carregar contas da plataforma.' });
    }
  };

  const loadSchoolDocuments = async (schoolIdToLoad: string) => {
    if (!schoolIdToLoad) {
      setDocuments([]);
      return;
    }
    try {
      const docs = await apiJson<OnboardingDocumentItem[]>(`/tenants/${schoolIdToLoad}/documents/`);
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
      setOfficialDomain(selectedSchool.domain || '');
      setDnsStatus(selectedSchool.dns_status || 'NOT_STARTED');
      setGoogleStatus(selectedSchool.google_status || 'NOT_STARTED');
      setMicrosoftStatus(selectedSchool.microsoft_status || 'NOT_STARTED');
      setCanvaStatus(selectedSchool.canva_status || 'NOT_STARTED');
      setFlagErp(Boolean(selectedSchool.enable_erp_sync));
      setFlagBenefits(Boolean(selectedSchool.enable_benefits_club));
      setFlagPayments(Boolean(selectedSchool.enable_online_payments));
      loadSchoolDocuments(selectedSchool.id);
    } else {
      setDocuments([]);
    }
  }, [selectedSchoolId, schools]);

  const handleReviewDocument = async (
    doc: OnboardingDocumentItem,
    decision: 'APPROVED' | 'REJECTED'
  ) => {
    if (!selectedSchool) return;
    setBusyId(doc.id);
    onFeedback(null);
    try {
      await apiJson(`/tenants/${selectedSchool.id}/documents/${doc.id}/review/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: decision,
          review_notes: reviewNotes[doc.id] ?? doc.review_notes ?? '',
        }),
      });
      onFeedback({
        type: 'success',
        message: `Documento "${doc.doc_type_label}" marcado como ${decision === 'APPROVED' ? 'Validado' : 'Rejeitado'}.`,
      });
      await loadSchoolDocuments(selectedSchool.id);
      onSchoolsUpdated();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveSchoolPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;
    setBusyId(selectedSchool.id);
    onFeedback(null);
    try {
      await apiJson(`/tenants/schools/${selectedSchool.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: officialDomain.trim() || null,
          dns_status: dnsStatus,
          google_status: googleStatus,
          microsoft_status: microsoftStatus,
          canva_status: canvaStatus,
          enable_erp_sync: flagErp,
          enable_benefits_club: flagBenefits,
          enable_online_payments: flagPayments,
        }),
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
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-stone-500">Escolas Registadas</p>
          <p className="mt-1 text-2xl font-bold text-stone-900">
            {schools.length}{' '}
            <span className="text-xs font-semibold text-emerald-700">({activeSchoolsCount} ativas)</span>
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-stone-500">Contas de Secretaria</p>
          <p className="mt-1 text-2xl font-bold text-stone-900">
            {profiles.filter((p) => p.role === 'SCHOOL_SECRETARY').length}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-stone-500">Administradores Globais</p>
          <p className="mt-1 text-2xl font-bold text-stone-900">
            {profiles.filter((p) => p.role === 'PLATFORM_ADMIN').length}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-stone-900">1. Instituições Multi-Tenant (.edu.ao)</h2>
          <p className="text-xs text-stone-600">
            Controlo exclusivo do Operador EduLink para ativar/suspender escolas ou abrir a gestão operacional de qualquer instituição.
          </p>
        </div>

        <div className="table-wrapper" tabIndex={0} role="region" aria-labelledby="platform-schools-caption">
          <table className="edulink-table">
            <caption id="platform-schools-caption" className="sr-only">
              Lista global de instituições registadas na plataforma EduLink
            </caption>
            <thead>
              <tr>
                <th scope="col">Instituição &amp; Domínio</th>
                <th scope="col">NIF / Alvará</th>
                <th scope="col">Comunidade</th>
                <th scope="col">Conformidade APD</th>
                <th scope="col">Estado</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-xs text-stone-500 py-4">
                    Nenhuma escola registada até ao momento.
                  </td>
                </tr>
              ) : (
                schools.map((school) => {
                  const host =
                    school.effective_site_host ||
                    school.domain ||
                    (school.preview_slug
                      ? `${school.preview_slug}.${getDisplayRootDomain()}`
                      : '');
                  return (
                  <tr
                    key={school.id}
                    className={selectedSchoolId === school.id ? 'bg-teal-50/40' : undefined}
                  >
                    <th scope="row" data-label="Instituição">
                      <span className="font-semibold text-stone-900 block">{school.name}</span>
                      <span className="text-[11px] font-mono text-stone-500">{host || 'Sem domínio'}</span>
                    </th>
                    <td data-label="NIF / Alvará" className="text-xs">
                      <span className="font-mono block">{school.nif}</span>
                      <span className="text-stone-500">{school.alvara_med_mescti}</span>
                    </td>
                    <td data-label="Comunidade" className="text-xs">
                      {school.total_students ?? 0} Alunos · {school.total_teachers ?? 0} Docentes
                    </td>
                    <td data-label="APD" className="text-xs">
                      {school.apd_notified ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          {school.apd_dossier_number || 'Notificada'}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td data-label="Estado">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          school.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {school.is_active ? 'Ativa' : 'Suspensa'}
                      </span>
                    </td>
                    <td data-label="Ações">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectSchool(school.id);
                            onOperateSchool(school.id);
                          }}
                          className="rounded-lg bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-800"
                        >
                          Gerir Escola
                        </button>
                        {host && (
                          <a
                            href={buildSchoolSiteHref(host, isLocalHostBrowser)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                          >
                            Ver Site ↗
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={busyId === school.id}
                          onClick={() => handleToggleSchoolActive(school)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                            school.is_active
                              ? 'border-red-300 text-red-700 hover:bg-red-50'
                              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {school.is_active ? 'Suspender' : 'Reativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-stone-900">2. Contas, Papéis RBAC &amp; Vínculos Escolares</h2>
            <p className="text-xs text-stone-600">
              Audite secretarias registadas, associe ou troque a instituição vinculada e ative/desative acessos.
            </p>
          </div>
          <button
            type="button"
            onClick={loadProfiles}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Atualizar Lista
          </button>
        </div>

        <div className="table-wrapper" tabIndex={0} role="region" aria-labelledby="platform-profiles-caption">
          <table className="edulink-table">
            <caption id="platform-profiles-caption" className="sr-only">
              Perfis de acesso e papéis RBAC da plataforma EduLink
            </caption>
            <thead>
              <tr>
                <th scope="col">Utilizador</th>
                <th scope="col">Papel RBAC</th>
                <th scope="col">Escola Vinculada</th>
                <th scope="col">Conta</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-xs text-stone-500 py-4">
                    Nenhum perfil encontrado.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" data-label="Utilizador">
                      <span className="font-semibold text-stone-900 block">{p.full_name}</span>
                      <span className="text-[11px] font-mono text-stone-500">{p.email || p.username}</span>
                    </th>
                    <td data-label="Papel RBAC">
                      <label htmlFor={`role-${p.id}`} className="sr-only">Papel de {p.email}</label>
                      <select
                        id={`role-${p.id}`}
                        value={p.role}
                        disabled={busyId === p.id}
                        onChange={(e) =>
                          handleUpdateProfile(p, { role: e.target.value as AdminUserProfile['role'] })
                        }
                        className="edulink-input text-xs py-1.5"
                      >
                        <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
                        <option value="SCHOOL_SECRETARY">SCHOOL_SECRETARY</option>
                        <option value="TEACHER">TEACHER</option>
                        <option value="STUDENT">STUDENT</option>
                      </select>
                    </td>
                    <td data-label="Escola Vinculada">
                      <label htmlFor={`school-${p.id}`} className="sr-only">Escola de {p.email}</label>
                      <select
                        id={`school-${p.id}`}
                        value={p.school || ''}
                        disabled={busyId === p.id}
                        onChange={(e) =>
                          handleUpdateProfile(p, { school: e.target.value || null })
                        }
                        className="edulink-input text-xs py-1.5"
                      >
                        <option value="">Global / Sem escola</option>
                        {schools.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.effective_site_host || s.domain || s.preview_slug || 'sem-domínio'})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Conta">
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => handleUpdateProfile(p, { user_is_active: !p.user_is_active })}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                          p.user_is_active
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100'
                        }`}
                      >
                        {p.user_is_active ? 'Ativa (Desativar)' : 'Inativa (Ativar)'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedSchool && (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              3. Revisão Documental, Pipeline &amp; Feature Flags — {selectedSchool.name}
            </h2>
            <p className="text-xs text-stone-600">
              Valide os comprovativos submetidos no onboarding, atualize os estados do pipeline chave-na-mão e ative módulos das Fases 2 e 3 para esta instituição.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-700">
              Documentos de Onboarding ({documents.length})
            </h3>
            <div className="table-wrapper" tabIndex={0} role="region" aria-labelledby="platform-docs-caption">
              <table className="edulink-table">
                <caption id="platform-docs-caption" className="sr-only">
                  Documentos legais enviados pela escola para revisão
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Documento</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Notas de Revisão</th>
                    <th scope="col">Decisão</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-xs text-stone-500 py-4">
                        Nenhum documento carregado por esta instituição até ao momento.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id}>
                        <th scope="row" data-label="Documento">
                          <span className="font-semibold text-stone-900 block">{doc.doc_type_label}</span>
                          {doc.file && (
                            <a
                              href={doc.file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-teal-700 underline"
                            >
                              Abrir Ficheiro ↗
                            </a>
                          )}
                        </th>
                        <td data-label="Estado">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              doc.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : doc.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {doc.status_label}
                          </span>
                        </td>
                        <td data-label="Notas">
                          <label htmlFor={`doc-note-${doc.id}`} className="sr-only">
                            Notas para {doc.doc_type_label}
                          </label>
                          <input
                            id={`doc-note-${doc.id}`}
                            type="text"
                            value={reviewNotes[doc.id] ?? doc.review_notes ?? ''}
                            onChange={(e) =>
                              setReviewNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))
                            }
                            placeholder="Observação opcional..."
                            className="edulink-input text-xs py-1.5"
                          />
                        </td>
                        <td data-label="Decisão">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={busyId === doc.id}
                              onClick={() => handleReviewDocument(doc, 'APPROVED')}
                              className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                            >
                              Aprovar
                            </button>
                            <button
                              type="button"
                              disabled={busyId === doc.id}
                              onClick={() => handleReviewDocument(doc, 'REJECTED')}
                              className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              Rejeitar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <form onSubmit={handleSaveSchoolPipeline} className="space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-stone-700">
              Domínio Oficial, Pipeline &amp; Feature Flags
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <label htmlFor="ops-school-domain" className="block text-xs font-semibold text-stone-700 mb-1">
                  Domínio Oficial (.edu.ao)
                </label>
                <input
                  id="ops-school-domain"
                  type="text"
                  value={officialDomain}
                  onChange={(e) => setOfficialDomain(e.target.value)}
                  placeholder="colegio-esperanca.edu.ao"
                  className="edulink-input text-xs font-mono"
                />
              </div>
              <div>
                <label htmlFor="ops-dns-stage" className="block text-xs font-semibold text-stone-700 mb-1">
                  DNS .edu.ao
                </label>
                <select id="ops-dns-stage" value={dnsStatus} onChange={(e) => setDnsStatus(e.target.value as SetupStage)} className="edulink-input text-xs">
                  {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="ops-google-stage" className="block text-xs font-semibold text-stone-700 mb-1">
                  Google Workspace
                </label>
                <select id="ops-google-stage" value={googleStatus} onChange={(e) => setGoogleStatus(e.target.value as SetupStage)} className="edulink-input text-xs">
                  {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="ops-ms-stage" className="block text-xs font-semibold text-stone-700 mb-1">
                  Microsoft 365
                </label>
                <select id="ops-ms-stage" value={microsoftStatus} onChange={(e) => setMicrosoftStatus(e.target.value as SetupStage)} className="edulink-input text-xs">
                  {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
              <div>
                <label htmlFor="ops-canva-stage" className="block text-xs font-semibold text-stone-700 mb-1">
                  Canva Educação
                </label>
                <select id="ops-canva-stage" value={canvaStatus} onChange={(e) => setCanvaStatus(e.target.value as SetupStage)} className="edulink-input text-xs">
                  {STAGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 pt-4">
                <input type="checkbox" checked={flagErp} onChange={(e) => setFlagErp(e.target.checked)} className="w-4 h-4 accent-teal-700" />
                Ativar ERP &amp; Verificadores (Fase 2)
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 pt-4">
                <input type="checkbox" checked={flagBenefits} onChange={(e) => setFlagBenefits(e.target.checked)} className="w-4 h-4 accent-teal-700" />
                Ativar Clube de Benefícios
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 pt-4">
                <input type="checkbox" checked={flagPayments} onChange={(e) => setFlagPayments(e.target.checked)} className="w-4 h-4 accent-teal-700" />
                Ativar Pagamentos Portal
              </label>
            </div>

            <button
              type="submit"
              disabled={busyId === selectedSchool.id}
              className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
            >
              Guardar Pipeline &amp; Flags
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
