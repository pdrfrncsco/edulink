'use client';

import React from 'react';
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
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
        <label htmlFor="active-school-select" className="text-xs font-bold uppercase text-stone-600 whitespace-nowrap">
          Escola Ativa (Tenant):
        </label>
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <select
            id="active-school-select"
            name="active_school_id"
            value={selectedSchoolId}
            onChange={(e) => onSelectSchool(e.target.value)}
            className="edulink-input w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-sm text-stone-900"
          >
            <option value="">-- Selecione uma escola ou registe uma nova --</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.domain})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onRefreshSchools}
            className="px-3 py-2.5 rounded-lg border border-stone-300 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-100 whitespace-nowrap"
          >
            Atualizar
          </button>
        </div>
      </div>

      {activeSchool && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-white border border-stone-200 font-mono text-stone-700">
            {activeSchool.domain}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-semibold">
            {activeSchool.total_students ?? 0} Alunos • {activeSchool.total_teachers ?? 0} Docentes
          </span>
          <span
            className={`px-2.5 py-1 rounded-full font-semibold border ${
              activeSchool.apd_notified
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {activeSchool.apd_notified
              ? `APD: ${activeSchool.apd_dossier_number || 'Submetido'}`
              : 'APD: Pendente'}
          </span>
        </div>
      )}
    </div>
  );
}
