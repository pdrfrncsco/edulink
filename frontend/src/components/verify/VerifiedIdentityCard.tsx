'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AlertBanner, Card, StatusBadge } from '@/components/ui';
import { getContrastTextColor } from '@/lib/formatters';

export interface VerifiedStudentInfo {
  full_name: string;
  role: string;
  institutional_email: string;
  bi_or_student_id: string;
  school_name: string;
  school_domain: string;
  school_primary_color?: string;
  school_logo_url?: string | null;
  institution_type?: 'MED_K12' | 'MESCTI_HIGHER_ED';
  apd_notified?: boolean;
  apd_dossier_number?: string;
  academic_year: string;
  grade_class: string;
  status: string;
  verified_at: number;
}

interface VerifiedIdentityCardProps {
  studentInfo: VerifiedStudentInfo;
}

/** Displays a verified active academic credential with school branding and APD badge. */
export default function VerifiedIdentityCard({ studentInfo }: VerifiedIdentityCardProps) {
  const brandBg = studentInfo.school_primary_color || '#0f766e';
  const brandFg = getContrastTextColor(brandBg);

  return (
    <div className="space-y-5">
      <AlertBanner tone="success" title="Vínculo Académico Confirmado">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
          <span>Matrícula ativa no ano lectivo {studentInfo.academic_year}.</span>
        </div>
      </AlertBanner>

      <Card variant="muted" padding="sm" className="rounded-2xl space-y-3 text-xs">
        <div className="flex items-center gap-3 pb-2 border-b border-stone-200/80">
          {studentInfo.school_logo_url ? (
            <img
              src={studentInfo.school_logo_url}
              alt={`Logótipo de ${studentInfo.school_name}`}
              className="w-10 h-10 rounded-xl bg-white border border-stone-200 object-contain p-1 shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm shrink-0 shadow-sm"
              style={{ backgroundColor: brandBg, color: brandFg }}
            >
              {(studentInfo.school_name || 'E').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <span className="font-bold text-stone-900 block truncate">
              {studentInfo.school_name}
            </span>
            <span className="text-[11px] font-mono text-stone-500 block truncate">
              {studentInfo.school_domain}
            </span>
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-stone-500 block">Titular</span>
          <span className="text-base font-bold text-stone-900 block">{studentInfo.full_name}</span>
          <span className="font-mono text-teal-800 block">{studentInfo.institutional_email}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Tutela</span>
            <span className="font-semibold text-stone-800">
              {studentInfo.institution_type === 'MESCTI_HIGHER_ED'
                ? 'Ensino Superior (MESCTI)'
                : 'Ensino Geral / Técnico (MED)'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 block">Papel</span>
            <span className="font-semibold text-stone-800">
              {studentInfo.role === 'TEACHER' ? 'Professor / Docente' : 'Estudante'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 block">
              N.º Identificação
            </span>
            <span className="font-mono font-semibold text-stone-800">
              {studentInfo.bi_or_student_id}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-500 block">
              Classe / Turma
            </span>
            <span className="font-semibold text-stone-800">{studentInfo.grade_class}</span>
          </div>
        </div>

        {studentInfo.apd_notified && (
          <div className="pt-1">
            <StatusBadge tone="success" dot>
              Conformidade APD{' '}
              {studentInfo.apd_dossier_number
                ? `· ${studentInfo.apd_dossier_number}`
                : 'Verificada'}
            </StatusBadge>
          </div>
        )}
      </Card>

      <p className="text-[11px] text-stone-500 text-center">
        Autenticado em tempo real pelos servidores EduLink ao abrigo da Lei n.º 22/11.
      </p>
    </div>
  );
}
