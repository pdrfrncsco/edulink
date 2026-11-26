'use client';

import React, { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';
import { AcademicUser, apiJson, FeedbackState } from './types';

interface DirectoryTabProps {
  schoolId: string;
  onFeedback: (fb: FeedbackState | null) => void;
  onDirectoryUpdated: () => void;
}

export default function DirectoryTab({ schoolId, onFeedback, onDirectoryUpdated }: DirectoryTabProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [csvStats, setCsvStats] = useState<any | null>(null);
  const [users, setUsers] = useState<AcademicUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    if (!schoolId) {
      setUsers([]);
      return;
    }
    try {
      const qs = new URLSearchParams({ school: schoolId });
      if (searchQuery.trim()) qs.set('search', searchQuery.trim());
      const data = await apiJson<{ results: AcademicUser[] }>(`/directory/users/?${qs.toString()}`);
      setUsers(data.results || []);
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    }
  };

  useEffect(() => {
    loadUsers();
  }, [schoolId]);

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) {
      onFeedback({ type: 'error', message: 'Selecione uma escola na barra superior antes de importar o CSV.' });
      return;
    }
    if (!csvFile) {
      onFeedback({ type: 'error', message: 'Selecione um ficheiro CSV primeiro.' });
      return;
    }

    setLoading(true);
    onFeedback(null);
    setCsvStats(null);

    const payload = new FormData();
    payload.append('school_id', schoolId);
    payload.append('file', csvFile);
    payload.append('academic_year', academicYear);

    try {
      const res = await authFetch('/directory/upload-csv/', { method: 'POST', body: payload });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || JSON.stringify(result));

      setCsvStats(result.stats);
      onFeedback({ type: 'success', message: `Importação processada para ${result.school}!` });
      await loadUsers();
      onDirectoryUpdated();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message || 'Falha ao importar CSV.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnrollmentStatus = async (user: AcademicUser) => {
    if (!user.active_enrollment) return;
    const nextStatus = user.active_enrollment.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    onFeedback(null);
    try {
      await apiJson(`/directory/enrollments/${user.active_enrollment.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      onFeedback({
        type: 'success',
        message:
          nextStatus === 'SUSPENDED'
            ? `Matrícula de ${user.full_name} suspensa — revogação automática de nuvem e QR Code disparada.`
            : `Matrícula de ${user.full_name} reativada — re-sincronização na nuvem disparada.`,
      });
      await loadUsers();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="border-b border-stone-100 pb-4">
          <h2 id="csv-form-heading" className="text-lg font-bold text-stone-900">
            Importação em Lote da Secretaria (CSV)
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Carregue a listagem exportada do Kacennu, KLASSE, SysPortal ou Excel para gerar contas institucionais <code>.edu.ao</code>.
          </p>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-600">
          <span className="font-semibold block text-stone-800 uppercase mb-1">Cabeçalhos suportados (`,` ou `;`):</span>
          <code className="block bg-white p-2.5 rounded border border-stone-200 font-mono text-[11px] overflow-x-auto text-teal-800">
            nome_completo;bi_ou_processo;tipo;classe_turma;ano_lectivo;telefone;email_pessoal
          </code>
        </div>

        <form onSubmit={handleCsvUpload} aria-labelledby="csv-form-heading" className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="csv-year" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
              Ano Lectivo
            </label>
            <input
              id="csv-year"
              name="academic_year"
              type="text"
              required
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="edulink-input w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm"
            />
          </div>

          <div>
            <label htmlFor="csv-file" className="block text-xs font-semibold uppercase text-stone-700 mb-1.5">
              Ficheiro CSV <span aria-hidden="true">*</span>
            </label>
            <input
              id="csv-file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
              className="edulink-input w-full px-3 py-2 rounded-xl border border-stone-300 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !schoolId}
            className="px-5 py-3 rounded-xl bg-teal-700 text-white font-semibold text-sm hover:bg-teal-800 disabled:opacity-50 transition shadow-sm"
          >
            {loading ? 'Processando...' : 'Importar Alunos e Docentes'}
          </button>
        </form>

        {csvStats && (
          <div className="border-t border-stone-200 pt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center">
              <span className="block text-xs text-stone-500">Linhas</span>
              <span className="text-xl font-bold text-stone-900">{csvStats.total_rows}</span>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
              <span className="block text-xs text-teal-700">Criados</span>
              <span className="text-xl font-bold text-teal-800">{csvStats.created_users}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <span className="block text-xs text-amber-700">Atualizados</span>
              <span className="text-xl font-bold text-amber-800">{csvStats.updated_users}</span>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-center">
              <span className="block text-xs text-stone-500">Matrículas</span>
              <span className="text-xl font-bold text-stone-900">{csvStats.created_enrollments}</span>
            </div>
          </div>
        )}
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 id="directory-table-caption" className="text-base font-bold text-stone-900">
              Directório Académico & Controlo de Matrículas ({users.length})
            </h3>
            <p className="text-xs text-stone-500">
              Suspender uma matrícula revoga automaticamente o acesso Google/Microsoft e invalida o Cartão Digital.
            </p>
          </div>
          <search>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadUsers();
              }}
              className="flex gap-2"
            >
              <label htmlFor="directory-search" className="sr-only">
                Pesquisar utilizador
              </label>
              <input
                id="directory-search"
                name="search"
                type="search"
                placeholder="Nome, e-mail ou BI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="edulink-input px-3 py-1.5 rounded-lg border border-stone-300 text-sm"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Filtrar
              </button>
            </form>
          </search>
        </div>

        <div tabIndex={0} role="region" aria-labelledby="directory-table-caption" className="table-wrapper">
          <table className="edulink-table text-xs sm:text-sm">
            <caption className="sr-only">Lista de estudantes e professores da escola</caption>
            <thead>
              <tr className="text-xs uppercase text-stone-600 border-b border-stone-200">
                <th className="p-3 font-semibold">Nome</th>
                <th className="p-3 font-semibold">Papel</th>
                <th className="p-3 font-semibold">E-mail Institucional</th>
                <th className="p-3 font-semibold">Turma / Ano</th>
                <th className="p-3 font-semibold">Matrícula</th>
                <th className="p-3 font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-stone-500">
                    {schoolId ? 'Nenhum utilizador encontrado para esta escola.' : 'Selecione uma escola primeiro.'}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50/70">
                    <th scope="row" className="p-3 font-semibold text-stone-900">
                      {u.full_name}
                      <span className="block text-[11px] font-mono font-normal text-stone-500">{u.bi_or_student_id}</span>
                    </th>
                    <td data-label="Papel" className="p-3 text-stone-700">
                      {u.role === 'TEACHER' ? 'Professor' : u.role === 'STAFF' ? 'Administrativo' : 'Estudante'}
                    </td>
                    <td data-label="E-mail" className="p-3 font-mono text-xs text-teal-800">
                      {u.institutional_email}
                    </td>
                    <td data-label="Turma" className="p-3 text-stone-700">
                      {u.active_enrollment ? `${u.active_enrollment.grade_class} (${u.active_enrollment.academic_year})` : '—'}
                    </td>
                    <td data-label="Matrícula" className="p-3">
                      {u.active_enrollment ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            u.active_enrollment.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {u.active_enrollment.status}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td data-label="Ação" className="p-3">
                      {u.active_enrollment && (
                        <button
                          type="button"
                          onClick={() => handleToggleEnrollmentStatus(u)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            u.active_enrollment.status === 'ACTIVE'
                              ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                              : 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100'
                          }`}
                        >
                          {u.active_enrollment.status === 'ACTIVE' ? 'Suspender' : 'Reativar'}
                        </button>
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
