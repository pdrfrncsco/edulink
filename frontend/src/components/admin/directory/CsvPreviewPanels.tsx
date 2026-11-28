'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertBanner,
  Button,
  DataTable,
  type DataTableColumn,
  StatusBadge,
} from '@/components/ui';
import {
  formatRoleLabel,
  type CsvAnalysisResult,
  type CsvParsedRow,
  type CsvRowIssue,
} from './csvParser';

interface CsvPreviewPanelsProps {
  analysis: CsvAnalysisResult;
  onDownloadSample: () => void;
}

type IssueFilter = 'all' | 'error' | 'warning';

const INITIAL_ISSUES_LIMIT = 25;

/** Displays client-side CSV pre-validation stats, line-by-line issues, and a sample of parsed rows. */
export default function CsvPreviewPanels({ analysis, onDownloadSample }: CsvPreviewPanelsProps) {
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all');
  const [showAllIssues, setShowAllIssues] = useState(false);

  const errorCount = useMemo(
    () => analysis.issues.filter((item) => item.severity === 'error').length,
    [analysis.issues],
  );
  const warningCount = useMemo(
    () => analysis.issues.filter((item) => item.severity === 'warning').length,
    [analysis.issues],
  );

  const filteredIssues = useMemo(() => {
    if (issueFilter === 'all') return analysis.issues;
    return analysis.issues.filter((item) => item.severity === issueFilter);
  }, [analysis.issues, issueFilter]);

  const visibleIssues = showAllIssues
    ? filteredIssues
    : filteredIssues.slice(0, INITIAL_ISSUES_LIMIT);

  const previewRows = useMemo(() => analysis.validRows.slice(0, 5), [analysis.validRows]);

  if (analysis.structureError) {
    return (
      <AlertBanner
        tone="error"
        title="Não foi possível reconhecer as colunas do ficheiro"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDownloadSample}
            className="min-h-[44px] sm:min-h-8"
          >
            Baixar modelo CSV
          </Button>
        }
      >
        <div className="space-y-2">
          <p>{analysis.structureError}</p>
          {analysis.structureHints.map((hint, idx) => (
            <p key={idx} className="text-xs font-medium">
              {hint}
            </p>
          ))}
          {analysis.headers.length > 0 && (
            <p className="text-xs">
              Colunas lidas na linha 1:{' '}
              <span className="font-mono break-all">{analysis.headers.join(' | ')}</span>
            </p>
          )}
        </div>
      </AlertBanner>
    );
  }

  const issueColumns: DataTableColumn<CsvRowIssue>[] = [
    {
      key: 'line',
      header: 'Linha',
      isRowHeader: true,
      cellClassName: 'font-mono text-xs whitespace-nowrap text-stone-700',
      render: (issue) => `Linha ${issue.lineNumber}`,
    },
    {
      key: 'person',
      header: 'Registo no ficheiro',
      cellClassName: 'whitespace-normal min-w-[150px]',
      render: (issue) => (
        <div>
          <p className="font-medium text-stone-900 text-xs">{issue.displayName}</p>
          {issue.biOrId && (
            <p className="text-[11px] font-mono text-stone-500 mt-0.5">{issue.biOrId}</p>
          )}
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Estado',
      cellClassName: 'whitespace-nowrap',
      render: (issue) =>
        issue.severity === 'error' ? (
          <StatusBadge tone="error" size="sm" dot>
            Será ignorada
          </StatusBadge>
        ) : (
          <StatusBadge tone="warning" size="sm" dot>
            Aviso
          </StatusBadge>
        ),
    },
    {
      key: 'message',
      header: 'O que aconteceu e como resolver',
      cellClassName: 'whitespace-normal min-w-[230px]',
      render: (issue) => (
        <div className="space-y-1">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            {issue.fieldLabel}
          </span>
          <p className="text-xs text-stone-700 leading-relaxed">{issue.message}</p>
        </div>
      ),
    },
  ];

  const previewColumns: DataTableColumn<CsvParsedRow>[] = [
    {
      key: 'line',
      header: 'Linha',
      cellClassName: 'font-mono text-xs whitespace-nowrap text-stone-500',
      render: (row) => `${row.lineNumber}`,
    },
    {
      key: 'name',
      header: 'Nome completo',
      isRowHeader: true,
      cellClassName: 'font-medium text-stone-900 whitespace-normal min-w-[150px]',
      render: (row) => row.fullName,
    },
    {
      key: 'bi',
      header: 'BI / Processo',
      cellClassName: 'font-mono text-xs whitespace-nowrap text-stone-700',
      render: (row) => row.biOrId || <span className="text-stone-400">Automático (PROC-...)</span>,
    },
    {
      key: 'role',
      header: 'Papel',
      cellClassName: 'whitespace-nowrap',
      render: (row) => (
        <StatusBadge
          tone={row.role === 'TEACHER' ? 'brand' : row.role === 'STAFF' ? 'info' : 'neutral'}
          size="sm"
        >
          {formatRoleLabel(row.role)}
        </StatusBadge>
      ),
    },
    {
      key: 'class',
      header: 'Turma / Dept.',
      cellClassName: 'text-xs text-stone-700 whitespace-normal min-w-[130px]',
      render: (row) => row.gradeClass,
    },
    {
      key: 'email',
      header: 'E-mail pessoal',
      cellClassName: 'text-xs text-stone-600 whitespace-nowrap',
      render: (row) =>
        row.personalEmail && row.personalEmail.includes('@') ? (
          row.personalEmail
        ) : (
          <span className="text-stone-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-stone-200 bg-stone-50 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-stone-800">
              Pré-verificação de «{analysis.fileName}»
            </p>
            <p className="text-[11px] text-stone-500">
              Codificação {analysis.encoding} · Separador «{analysis.delimiter}» ·{' '}
              {analysis.roleCounts.student} estudantes, {analysis.roleCounts.teacher} docentes,{' '}
              {analysis.roleCounts.staff} funcionários
            </p>
          </div>
          <StatusBadge
            tone={analysis.skippedErrorRows.length > 0 ? 'warning' : 'success'}
            size="sm"
            dot
          >
            {analysis.validRows.length}{' '}
            {analysis.validRows.length === 1 ? 'pronto a importar' : 'prontos a importar'}
          </StatusBadge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-md border border-stone-200 bg-white px-3 py-2">
            <p className="text-[11px] text-stone-500">Linhas lidas</p>
            <p className="text-lg font-bold text-stone-900 tabular-nums">
              {analysis.totalDataRows}
            </p>
          </div>
          <div className="rounded-md border border-teal-200 bg-teal-50/70 px-3 py-2">
            <p className="text-[11px] text-teal-800">Prontas a importar</p>
            <p className="text-lg font-bold text-teal-800 tabular-nums">
              {analysis.validRows.length}
            </p>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2">
            <p className="text-[11px] text-amber-800">Linhas com avisos</p>
            <p className="text-lg font-bold text-amber-800 tabular-nums">
              {analysis.warningRowsCount}
            </p>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50/70 px-3 py-2">
            <p className="text-[11px] text-red-800">Ignoradas (sem nome)</p>
            <p className="text-lg font-bold text-red-800 tabular-nums">
              {analysis.skippedErrorRows.length}
            </p>
          </div>
        </div>
      </div>

      {analysis.issues.length === 0 ? (
        <AlertBanner tone="success" title="Lista pronta sem erros nem avisos">
          Todas as {analysis.validRows.length} linhas têm nome, identificação e campos reconhecidos
          corretamente. Reveja a amostra abaixo e clique em confirmar quando estiver pronto.
        </AlertBanner>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h4 id="csv-issues-caption" className="text-sm font-bold text-stone-900">
                Apontamentos linha-a-linha ({analysis.issues.length})
              </h4>
              <p className="text-xs text-stone-500">
                Linhas com erro de nome são ignoradas sem bloquear os restantes alunos.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={issueFilter === 'all' ? 'primary' : 'outline'}
                onClick={() => setIssueFilter('all')}
                className="min-h-[44px] sm:min-h-8"
              >
                Todos ({analysis.issues.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={issueFilter === 'error' ? 'danger-solid' : 'outline'}
                onClick={() => setIssueFilter('error')}
                disabled={errorCount === 0}
                className="min-h-[44px] sm:min-h-8"
              >
                Ignoradas ({errorCount})
              </Button>
              <Button
                type="button"
                size="sm"
                variant={issueFilter === 'warning' ? 'secondary' : 'outline'}
                onClick={() => setIssueFilter('warning')}
                disabled={warningCount === 0}
                className="min-h-[44px] sm:min-h-8"
              >
                Avisos ({warningCount})
              </Button>
            </div>
          </div>

          <DataTable
            columns={issueColumns}
            data={visibleIssues}
            getRowKey={(issue) => issue.id}
            caption="Lista de erros e avisos por linha do ficheiro CSV"
            labelledBy="csv-issues-caption"
            emptyTitle="Nenhum apontamento nesta categoria"
            emptyDescription="Mude o filtro acima para ver os restantes registos."
          />

          {filteredIssues.length > INITIAL_ISSUES_LIMIT && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAllIssues((prev) => !prev)}
                className="min-h-[44px] sm:min-h-8"
              >
                {showAllIssues
                  ? 'Mostrar apenas os primeiros 25 apontamentos'
                  : `Ver todos os ${filteredIssues.length} apontamentos`}
              </Button>
            </div>
          )}
        </div>
      )}

      {previewRows.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 id="csv-preview-caption" className="text-sm font-bold text-stone-900">
              Amostra das primeiras linhas lidas
            </h4>
            <span className="text-xs text-stone-500">
              A mostrar {previewRows.length} de {analysis.validRows.length} registos válidos
            </span>
          </div>
          <DataTable
            columns={previewColumns}
            data={previewRows}
            getRowKey={(row) => `preview-${row.lineNumber}`}
            caption="Pré-visualização das primeiras 5 linhas válidas do ficheiro CSV"
            labelledBy="csv-preview-caption"
          />
        </div>
      )}
    </div>
  );
}
