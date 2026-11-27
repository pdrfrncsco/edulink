'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Card, Select, StatusBadge } from '@/components/ui';
import { School } from './types';

interface SchoolSelectorBarProps {
  schools: School[];
  selectedSchoolId: string;
  onSelectSchool: (id: string) => void;
  onRefreshSchools: () => void;
}

export default function SchoolSelectorBar({
  schools,
  selectedSchoolId,
  onSelectSchool,
  onRefreshSchools,
}: SchoolSelectorBarProps) {
  const activeSchool = schools.find((s) => s.id === selectedSchoolId) || null;

  return (
    <Card variant="muted" padding="sm" className="rounded-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
        <label htmlFor="active-school-select" className="text-xs font-bold uppercase text-stone-600 whitespace-nowrap">
          Escola Ativa (Tenant):
        </label>
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <Select
            id="active-school-select"
            name="active_school_id"
            value={selectedSchoolId}
            onChange={(e) => onSelectSchool(e.target.value)}
            className="rounded-lg py-2"
          >
            <option value="">-- Selecione uma escola ou registe uma nova --</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.effective_site_host || s.domain || s.preview_slug || 'sem-domínio'})
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefreshSchools}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Atualizar
          </Button>
        </div>
      </div>

      {activeSchool && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge tone="neutral" size="md" mono className="bg-white">
            {activeSchool.effective_site_host || activeSchool.domain || activeSchool.preview_slug}
          </StatusBadge>
          <StatusBadge tone="brand" size="md">
            {activeSchool.total_students ?? 0} Alunos • {activeSchool.total_teachers ?? 0} Docentes
          </StatusBadge>
          <StatusBadge tone={activeSchool.apd_notified ? 'success' : 'warning'} size="md" dot>
            {activeSchool.apd_notified
              ? `APD: ${activeSchool.apd_dossier_number || 'Submetido'}`
              : 'APD: Pendente'}
          </StatusBadge>
        </div>
      )}
    </Card>
  );
}
