'use client';

import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button, Card, ConfirmModal, DataTable, StatusBadge, type DataTableColumn } from '@/components/ui';
import { buildSchoolSiteHref, getDisplayRootDomain } from '@/lib/siteUrls';
import type { School } from '../types';

interface OpsSchoolsTableProps {
  schools: School[];
  selectedSchoolId: string;
  isLocalHostBrowser: boolean;
  busyId: string | null;
  onSelectSchool: (id: string) => void;
  onOperateSchool: (id: string) => void;
  onToggleSchoolActive: (school: School) => Promise<void>;
}

/** Multi-tenant `.edu.ao` school registry table with confirmation on suspension/reactivation. */
export default function OpsSchoolsTable({
  schools,
  selectedSchoolId,
  isLocalHostBrowser,
  busyId,
  onSelectSchool,
  onOperateSchool,
  onToggleSchoolActive,
}: OpsSchoolsTableProps) {
  const [confirmSchool, setConfirmSchool] = useState<School | null>(null);
  const rootDomain = getDisplayRootDomain();

  const columns: DataTableColumn<School>[] = [
    {
      key: 'name',
      header: 'Instituição & Domínio',
      isRowHeader: true,
      render: (school) => {
        const host =
          school.effective_site_host ||
          school.domain ||
          (school.preview_slug ? `${school.preview_slug}.${rootDomain}` : '');
        return (
          <div className={selectedSchoolId === school.id ? 'text-teal-900' : undefined}>
            <span className="font-semibold block">{school.name}</span>
            <span className="text-[11px] font-mono font-normal text-stone-500">
              {host || 'Sem domínio'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'legal',
      header: 'NIF / Alvará',
      cellClassName: 'text-xs',
      render: (school) => (
        <div>
          <span className="font-mono block">{school.nif}</span>
          <span className="text-stone-500">{school.alvara_med_mescti}</span>
        </div>
      ),
    },
    {
      key: 'community',
      header: 'Comunidade',
      cellClassName: 'text-xs',
      render: (school) =>
        `${school.total_students ?? 0} Alunos · ${school.total_teachers ?? 0} Docentes`,
    },
    {
      key: 'apd',
      header: 'Conformidade APD',
      render: (school) =>
        school.apd_notified ? (
          <StatusBadge tone="success" dot>
            {school.apd_dossier_number || 'Notificada'}
          </StatusBadge>
        ) : (
          <StatusBadge tone="warning" dot>
            Pendente
          </StatusBadge>
        ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (school) => (
        <StatusBadge tone={school.is_active ? 'success' : 'error'} dot>
          {school.is_active ? 'Ativa' : 'Suspensa'}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (school) => {
        const host =
          school.effective_site_host ||
          school.domain ||
          (school.preview_slug ? `${school.preview_slug}.${rootDomain}` : '');
        return (
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onSelectSchool(school.id);
                onOperateSchool(school.id);
              }}
            >
              Gerir Escola
            </Button>
            {host && (
              <a
                href={buildSchoolSiteHref(host, isLocalHostBrowser)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                <span>Ver Site</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
            <Button
              type="button"
              variant={school.is_active ? 'danger' : 'outline'}
              size="sm"
              loading={busyId === school.id}
              onClick={() => setConfirmSchool(school)}
            >
              {school.is_active ? 'Suspender' : 'Reativar'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <Card padding="md" className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-stone-900">
          1. Instituições Multi-Tenant (.edu.ao)
        </h2>
        <p className="text-xs text-stone-600">
          Controlo exclusivo do Operador EduLink para ativar/suspender escolas ou abrir a gestão
          operacional de qualquer instituição.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={schools}
        getRowKey={(school) => school.id}
        caption="Lista global de instituições registadas na plataforma EduLink"
        emptyTitle="Nenhuma escola registada até ao momento"
      />

      <ConfirmModal
        open={Boolean(confirmSchool)}
        onClose={() => setConfirmSchool(null)}
        onConfirm={async () => {
          if (!confirmSchool) return;
          await onToggleSchoolActive(confirmSchool);
          setConfirmSchool(null);
        }}
        destructive={Boolean(confirmSchool?.is_active)}
        loading={Boolean(confirmSchool && busyId === confirmSchool.id)}
        title={
          confirmSchool?.is_active
            ? `Suspender "${confirmSchool.name}"?`
            : `Reativar "${confirmSchool?.name}"?`
        }
        description={
          confirmSchool?.is_active
            ? 'O site institucional deixará de estar disponível e os acessos da escola serão bloqueados imediatamente.'
            : 'O site institucional e os acessos da secretaria e alunos voltarão a ficar disponíveis.'
        }
        confirmLabel={confirmSchool?.is_active ? 'Suspender Escola' : 'Reativar Escola'}
      />
    </Card>
  );
}
