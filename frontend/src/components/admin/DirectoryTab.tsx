'use client';

import React, { useEffect, useState } from 'react';
import { Mail, Search } from 'lucide-react';
import {
  Button,
  Card,
  ConfirmModal,
  DataTable,
  Input,
  StatusBadge,
  type DataTableColumn,
} from '@/components/ui';
import CsvImportPanel from './CsvImportPanel';
import { AcademicUser, apiJson, FeedbackState } from './types';

interface DirectoryTabProps {
  schoolId: string;
  onFeedback: (fb: FeedbackState | null) => void;
  onDirectoryUpdated: () => void;
}

/** Academic directory CSV importer and enrollment lifecycle panel with suspension confirmation. */
export default function DirectoryTab({
  schoolId,
  onFeedback,
  onDirectoryUpdated,
}: DirectoryTabProps) {
  const [users, setUsers] = useState<AcademicUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmSuspendUser, setConfirmSuspendUser] = useState<AcademicUser | null>(null);

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

  const executeEnrollmentStatusChange = async (
    user: AcademicUser,
    nextStatus: 'ACTIVE' | 'SUSPENDED'
  ) => {
    if (!user.active_enrollment) return;
    setLoading(true);
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
      setConfirmSuspendUser(null);
      await loadUsers();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendActivationInvite = async (userId: string) => {
    onFeedback(null);
    try {
      const res = await apiJson<{ message: string }>(
        `/directory/users/${userId}/send-activation-email/`,
        { method: 'POST' }
      );
      onFeedback({ type: 'success', message: res.message });
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    }
  };

  const handleBulkActivationInvites = async () => {
    if (!schoolId) return;
    setLoading(true);
    onFeedback(null);
    try {
      const res = await apiJson<{ sent: number }>('/directory/users/send-bulk-activation-emails/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId }),
      });
      onFeedback({
        type: 'success',
        message: `Convites de ativação enviados para ${res.sent} conta(s) pendente(s).`,
      });
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const columns: DataTableColumn<AcademicUser>[] = [
    {
      key: 'name',
      header: 'Nome',
      isRowHeader: true,
      render: (u) => (
        <div>
          <span className="font-semibold text-stone-900 block">{u.full_name}</span>
          <span className="block text-[11px] font-mono font-normal text-stone-500">
            {u.bi_or_student_id}
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Papel',
      render: (u) =>
        u.role === 'TEACHER' ? 'Professor' : u.role === 'STAFF' ? 'Administrativo' : 'Estudante',
    },
    {
      key: 'email',
      header: 'E-mail Institucional',
      cellClassName: 'font-mono text-xs text-teal-800',
      render: (u) => u.institutional_email,
    },
    {
      key: 'class',
      header: 'Turma / Ano',
      render: (u) =>
        u.active_enrollment
          ? `${u.active_enrollment.grade_class} (${u.active_enrollment.academic_year})`
          : '—',
    },
    {
      key: 'status',
      header: 'Matrícula',
      render: (u) =>
        u.active_enrollment ? (
          <StatusBadge tone={u.active_enrollment.status === 'ACTIVE' ? 'success' : 'error'} dot>
            {u.active_enrollment.status === 'ACTIVE' ? 'Ativa' : u.active_enrollment.status}
          </StatusBadge>
        ) : (
          '—'
        ),
    },
    {
      key: 'actions',
      header: 'Ação',
      render: (u) => (
        <div className="flex flex-wrap gap-1.5">
          {u.active_enrollment && (
            <Button
              type="button"
              size="sm"
              variant={u.active_enrollment.status === 'ACTIVE' ? 'danger' : 'outline'}
              onClick={() =>
                u.active_enrollment?.status === 'ACTIVE'
                  ? setConfirmSuspendUser(u)
                  : executeEnrollmentStatusChange(u, 'ACTIVE')
              }
            >
              {u.active_enrollment.status === 'ACTIVE' ? 'Suspender' : 'Reativar'}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSendActivationInvite(u.id)}
          >
            Convidar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CsvImportPanel
        schoolId={schoolId}
        loading={loading}
        onSetLoading={setLoading}
        onFeedback={onFeedback}
        onImported={async () => {
          await loadUsers();
          onDirectoryUpdated();
        }}
      />

      <Card padding="lg" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 id="directory-table-caption" className="text-base font-bold text-stone-900">
              Directório Académico &amp; Controlo de Matrículas ({users.length})
            </h3>
            <p className="text-xs text-stone-500">
              Suspender uma matrícula revoga automaticamente o acesso Google/Microsoft e invalida o
              Cartão Digital.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!schoolId || loading}
              onClick={handleBulkActivationInvites}
              leftIcon={<Mail className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Enviar Convites (.edu.ao)
            </Button>
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
                <Input
                  id="directory-search"
                  name="search"
                  type="search"
                  placeholder="Nome, e-mail ou BI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="py-1.5"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="md"
                  leftIcon={<Search className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Filtrar
                </Button>
              </form>
            </search>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={users}
          getRowKey={(u) => u.id}
          caption="Lista de estudantes e professores da escola"
          labelledBy="directory-table-caption"
          emptyTitle={
            schoolId
              ? 'Nenhum utilizador encontrado para esta escola'
              : 'Selecione uma escola primeiro'
          }
          emptyDescription="Importe um ficheiro CSV acima para criar estudantes e docentes."
        />
      </Card>

      <ConfirmModal
        open={Boolean(confirmSuspendUser)}
        onClose={() => setConfirmSuspendUser(null)}
        onConfirm={() => {
          if (confirmSuspendUser) executeEnrollmentStatusChange(confirmSuspendUser, 'SUSPENDED');
        }}
        destructive
        loading={loading}
        title={`Suspender matrícula de ${confirmSuspendUser?.full_name}?`}
        description="Esta ação suspende imediatamente a conta Google Workspace / Microsoft 365 e invalida o Cartão Digital QR na verificação pública."
        confirmLabel="Suspender Matrícula"
      />
    </div>
  );
}
