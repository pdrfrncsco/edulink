'use client';

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Card, ConfirmModal, DataTable, Select, type DataTableColumn } from '@/components/ui';
import type { AdminUserProfile, School } from '../types';

interface OpsProfilesTableProps {
  profiles: AdminUserProfile[];
  schools: School[];
  busyId: string | null;
  onRefresh: () => void;
  onUpdateProfile: (
    profile: AdminUserProfile,
    patch: Partial<{ role: AdminUserProfile['role']; school: string | null; user_is_active: boolean }>
  ) => Promise<void>;
}

/** RBAC user profiles and tenant-binding table with confirmation on account deactivation. */
export default function OpsProfilesTable({
  profiles,
  schools,
  busyId,
  onRefresh,
  onUpdateProfile,
}: OpsProfilesTableProps) {
  const [confirmToggleProfile, setConfirmToggleProfile] = useState<AdminUserProfile | null>(null);

  const columns: DataTableColumn<AdminUserProfile>[] = [
    {
      key: 'user',
      header: 'Utilizador',
      isRowHeader: true,
      render: (p) => (
        <div>
          <span className="font-semibold text-stone-900 block">{p.full_name}</span>
          <span className="text-[11px] font-mono font-normal text-stone-500">
            {p.email || p.username}
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Papel RBAC',
      render: (p) => (
        <div>
          <label htmlFor={`role-${p.id}`} className="sr-only">
            Papel de {p.email}
          </label>
          <Select
            id={`role-${p.id}`}
            value={p.role}
            disabled={busyId === p.id}
            onChange={(e) =>
              onUpdateProfile(p, { role: e.target.value as AdminUserProfile['role'] })
            }
            className="text-xs py-1.5 min-h-[38px]"
          >
            <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
            <option value="SCHOOL_SECRETARY">SCHOOL_SECRETARY</option>
            <option value="TEACHER">TEACHER</option>
            <option value="STUDENT">STUDENT</option>
          </Select>
        </div>
      ),
    },
    {
      key: 'school',
      header: 'Escola Vinculada',
      render: (p) => (
        <div>
          <label htmlFor={`school-${p.id}`} className="sr-only">
            Escola de {p.email}
          </label>
          <Select
            id={`school-${p.id}`}
            value={p.school || ''}
            disabled={busyId === p.id}
            onChange={(e) => onUpdateProfile(p, { school: e.target.value || null })}
            className="text-xs py-1.5 min-h-[38px]"
          >
            <option value="">Global / Sem escola</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.effective_site_host || s.domain || s.preview_slug || 'sem-domínio'})
              </option>
            ))}
          </Select>
        </div>
      ),
    },
    {
      key: 'account',
      header: 'Conta',
      render: (p) => (
        <Button
          type="button"
          size="sm"
          variant={p.user_is_active ? 'outline' : 'danger'}
          loading={busyId === p.id}
          onClick={() =>
            p.user_is_active
              ? setConfirmToggleProfile(p)
              : onUpdateProfile(p, { user_is_active: true })
          }
        >
          {p.user_is_active ? 'Ativa (Desativar)' : 'Inativa (Ativar)'}
        </Button>
      ),
    },
  ];

  return (
    <Card padding="md" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-stone-900">
            2. Contas, Papéis RBAC &amp; Vínculos Escolares
          </h2>
          <p className="text-xs text-stone-600">
            Audite secretarias registadas, associe ou troque a instituição vinculada e
            ative/desative acessos.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Atualizar Lista
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={profiles}
        getRowKey={(p) => p.id}
        caption="Perfis de acesso e papéis RBAC da plataforma EduLink"
        emptyTitle="Nenhum perfil encontrado"
      />

      <ConfirmModal
        open={Boolean(confirmToggleProfile)}
        onClose={() => setConfirmToggleProfile(null)}
        onConfirm={async () => {
          if (!confirmToggleProfile) return;
          await onUpdateProfile(confirmToggleProfile, { user_is_active: false });
          setConfirmToggleProfile(null);
        }}
        destructive
        loading={Boolean(confirmToggleProfile && busyId === confirmToggleProfile.id)}
        title={`Desativar conta de ${confirmToggleProfile?.email}?`}
        description="O utilizador perderá o acesso imediato ao portal e às APIs autenticadas."
        confirmLabel="Desativar Conta"
      />
    </Card>
  );
}
