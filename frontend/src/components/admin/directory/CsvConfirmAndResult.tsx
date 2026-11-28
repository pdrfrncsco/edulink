'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { AlertBanner, Button, Modal, StatusBadge } from '@/components/ui';
import type { CsvAnalysisResult, CsvImportStats } from './csvParser';

interface CsvConfirmImportModalProps {
  open: boolean;
  loading: boolean;
  academicYear: string;
  analysis: CsvAnalysisResult | null;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirmation dialog summarizing what the CSV import will create/update without deleting existing records. */
export function CsvConfirmImportModal({
  open,
  loading,
  academicYear,
  analysis,
  onClose,
  onConfirm,
}: CsvConfirmImportModalProps) {
  if (!analysis) return null;

  const validCount = analysis.validRows.length;
  const skippedCount = analysis.skippedErrorRows.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!loading}
      size="md"
      eyebrow="Confirmação antes de gravar"
      title="Confirmar importação da lista?"
      description="Reveja o resumo abaixo. Pode cancelar agora sem alterar nenhum registo da escola."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="min-h-[44px] sm:min-h-10"
          >
            Voltar e rever
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={loading}
            onClick={onConfirm}
            className="min-h-[44px] sm:min-h-10"
          >
            Confirmar e importar {validCount} {validCount === 1 ? 'registo' : 'registos'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <AlertBanner tone="info" title="Os dados existentes da escola estão protegidos">
          Contas que já tenham o mesmo BI ou número de processo são apenas atualizadas (nome, turma
          e contacto) mantendo a palavra-passe e o histórico intactos. Ninguém é apagado nesta
          importação.
        </AlertBanner>

        <dl className="rounded-lg border border-stone-200 bg-stone-50 divide-y divide-stone-200 text-sm">
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <dt className="text-stone-500">Ficheiro carregado</dt>
            <dd className="font-medium text-stone-900 truncate max-w-[220px]">
              {analysis.fileName}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <dt className="text-stone-500">Ano lectivo por omissão</dt>
            <dd className="font-mono font-semibold text-stone-900">{academicYear}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <dt className="text-stone-500">Registos prontos a importar</dt>
            <dd className="font-semibold text-teal-800">
              {validCount} ({analysis.roleCounts.student} alunos, {analysis.roleCounts.teacher}{' '}
              docentes, {analysis.roleCounts.staff} func.)
            </dd>
          </div>
        </dl>

        {skippedCount > 0 && (
          <AlertBanner tone="warning" title={`${skippedCount} linha(s) serão ignoradas`}>
            Essas linhas estão sem nome completo. Os restantes {validCount} registos entram
            normalmente e pode corrigir os que faltam no Excel depois, sem duplicar os já
            importados.
          </AlertBanner>
        )}

        {analysis.warningRowsCount > 0 && (
          <p className="text-xs text-stone-600 leading-relaxed">
            Nota: {analysis.warningRowsCount} linha(s) apresentam avisos ligeiros (ex.: sem BI ou sem
            e-mail pessoal). Serão importadas e podem ser completadas mais tarde.
          </p>
        )}
      </div>
    </Modal>
  );
}

interface CsvImportResultCardProps {
  stats: CsvImportStats;
  onDismiss: () => void;
}

/** Displays post-import counters and any line-level messages returned by `CSVImporterService`. */
export function CsvImportResultCard({ stats, onDismiss }: CsvImportResultCardProps) {
  const hasServerErrors = stats.errors && stats.errors.length > 0;

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
          <h4 className="text-sm font-bold text-stone-900">Importação concluída no sistema</h4>
          <StatusBadge tone={hasServerErrors ? 'warning' : 'success'} size="sm" dot>
            {hasServerErrors ? 'Concluída com apontamentos' : 'Sem erros'}
          </StatusBadge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="min-h-[44px] sm:min-h-8"
        >
          Ocultar resumo
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
        <div className="rounded-lg border border-stone-200 bg-white p-2.5">
          <p className="text-xl font-bold text-stone-900 tabular-nums">{stats.total_rows}</p>
          <p className="text-[11px] font-medium text-stone-500">Linhas lidas</p>
        </div>
        <div className="rounded-lg border border-teal-200 bg-white p-2.5">
          <p className="text-xl font-bold text-teal-700 tabular-nums">{stats.created_users}</p>
          <p className="text-[11px] font-medium text-stone-500">Contas criadas</p>
        </div>
        <div className="rounded-lg border border-sky-200 bg-white p-2.5">
          <p className="text-xl font-bold text-sky-700 tabular-nums">{stats.updated_users}</p>
          <p className="text-[11px] font-medium text-stone-500">Contas atualizadas</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-2.5">
          <p className="text-xl font-bold text-stone-800 tabular-nums">
            {stats.created_enrollments}
          </p>
          <p className="text-[11px] font-medium text-stone-500">Matrículas criadas</p>
        </div>
      </div>

      {hasServerErrors && (
        <AlertBanner
          tone="warning"
          title={`${stats.errors.length} linha(s) ignorada(s) durante a gravação`}
        >
          <ul className="list-disc pl-4 space-y-1 text-xs mt-1">
            {stats.errors.slice(0, 20).map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
          {stats.errors.length > 20 && (
            <p className="text-xs mt-1.5 font-medium">
              E mais {stats.errors.length - 20} linha(s) semelhantes.
            </p>
          )}
        </AlertBanner>
      )}

      <p className="text-xs text-stone-600">
        As novas contas já aparecem na tabela abaixo. Quando quiser notificar as pessoas com e-mail
        pessoal válido, clique em <strong className="text-stone-800">Enviar Convites (.edu.ao)</strong>.
      </p>
    </div>
  );
}
