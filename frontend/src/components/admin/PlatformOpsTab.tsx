'use client';

import React, { useEffect, useState } from 'react';
import { AdminUserProfile, apiJson, FeedbackState, School } from './types';

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
  const [profiles, setProfiles] = useState<AdminUserProfile[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadProfiles = async () => {
    try {
      const data = await apiJson<{ results?: AdminUserProfile[] } | AdminUserProfile[]>('/auth/profiles/');
      setProfiles(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message || 'Erro ao carregar contas da plataforma.' });
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

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
                schools.map((school) => (
                  <tr
                    key={school.id}
                    className={selectedSchoolId === school.id ? 'bg-teal-50/40' : undefined}
                  >
                    <th scope="row" data-label="Instituição">
                      <span className="font-semibold text-stone-900 block">{school.name}</span>
                      <span className="text-[11px] font-mono text-stone-500">{school.domain}</span>
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
                ))
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
                            {s.name} ({s.domain})
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
    </div>
  );
}
