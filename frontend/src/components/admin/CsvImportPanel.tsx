'use client';

import React, { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button, Card, FormField, Input, StatusBadge } from '@/components/ui';
import { authFetch } from '@/lib/auth';
import type { FeedbackState } from './types';

interface CsvImportPanelProps {
  schoolId: string;
  loading: boolean;
  onSetLoading: (loading: boolean) => void;
  onFeedback: (fb: FeedbackState | null) => void;
  onImported: () => Promise<void>;
}

/** Batch CSV importer for Angola ERPs (KLASSE, SysPortal, Kacennu, Excel) with client preview. */
export default function CsvImportPanel({
  schoolId,
  loading,
  onSetLoading,
  onFeedback,
  onImported,
}: CsvImportPanelProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{
    delimiter: string;
    headers: string[];
    rowCount: number;
    hasNameColumn: boolean;
  } | null>(null);
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [csvStats, setCsvStats] = useState<Record<string, number> | null>(null);

  const handleDownloadSampleCsv = () => {
    const sample = [
      'nome_completo;bi_ou_processo;tipo;classe_turma;ano_lectivo;telefone;email_pessoal',
      'Manuel Domingos de Sousa;008942114LA042;ALUNO;11ª Classe - CFB;2026/2027;923112233;manuel.personal@gmail.com',
      'Esperança Nzola Sebastião;007812930LA031;ALUNO;11ª Classe - CFB;2026/2027;945223344;esperanca.n@gmail.com',
      'António Baptista Mukinda;001289456HA012;PROFESSOR;Departamento de Física;2026/2027;912887766;a.mukinda@gmail.com',
    ].join('\n');
    const blob = new Blob(['\ufeff' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'turma_exemplo_angola.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelected = async (file: File | null) => {
    setCsvFile(file);
    setCsvPreview(null);
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) return;
      const headerLine = lines[0];
      const delimiter = headerLine.split(';').length > headerLine.split(',').length ? ';' : ',';
      const headers = headerLine.split(delimiter).map((h) => h.trim());
      const normalized = headers.map((h) => h.toLowerCase());
      const hasNameColumn = normalized.some((h) =>
        ['nome_completo', 'nome', 'estudante', 'aluno', 'professor'].includes(h)
      );
      setCsvPreview({
        delimiter,
        headers,
        rowCount: Math.max(0, lines.length - 1),
        hasNameColumn,
      });
    } catch {
      setCsvPreview(null);
    }
  };

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) {
      onFeedback({
        type: 'error',
        message: 'Selecione uma escola na barra superior antes de importar o CSV.',
      });
      return;
    }
    if (!csvFile) {
      onFeedback({ type: 'error', message: 'Selecione um ficheiro CSV primeiro.' });
      return;
    }

    onSetLoading(true);
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
      await onImported();
    } catch (err: any) {
      onFeedback({ type: 'error', message: err.message || 'Falha ao importar CSV.' });
    } finally {
      onSetLoading(false);
    }
  };

  return (
    <Card padding="lg" className="space-y-6">
      <div className="border-b border-stone-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 id="csv-form-heading" className="text-lg font-bold text-stone-900">
            Importação em Lote da Secretaria (CSV)
          </h2>
          <p className="text-xs sm:text-sm text-stone-500">
            Carregue a listagem exportada do Kacennu, KLASSE, SysPortal ou Excel para gerar contas
            institucionais <code>.edu.ao</code>.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownloadSampleCsv}
          leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Descarregar Modelo CSV
        </Button>
      </div>

      <Card variant="muted" padding="sm" className="rounded-xl text-xs text-stone-600">
        <span className="font-semibold block text-stone-800 uppercase mb-1">
          Cabeçalhos suportados (<code>,</code> ou <code>;</code>):
        </span>
        <code className="block bg-white p-2.5 rounded border border-stone-200 font-mono text-[11px] overflow-x-auto text-teal-800">
          nome_completo;bi_ou_processo;tipo;classe_turma;ano_lectivo;telefone;email_pessoal
        </code>
      </Card>

      <form
        onSubmit={handleCsvUpload}
        aria-labelledby="csv-form-heading"
        className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
      >
        <FormField id="csv-year" label="Ano Lectivo" required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="academic_year"
              type="text"
              required
              invalid={invalid}
              aria-describedby={describedBy}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          )}
        </FormField>

        <FormField id="csv-file" label="Ficheiro CSV" required>
          {({ id, describedBy }) => (
            <input
              id={id}
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              aria-describedby={describedBy}
              onChange={(e) => handleFileSelected(e.target.files ? e.target.files[0] : null)}
              className="edulink-input w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700"
            />
          )}
        </FormField>

        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={!schoolId}
          leftIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
        >
          {loading ? 'Processando...' : 'Importar Alunos e Docentes'}
        </Button>
      </form>

      {csvPreview && (
        <Card variant="muted" padding="sm" className="rounded-xl space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-stone-800">
              Pré-validação CSV: {csvPreview.rowCount} linha(s) · Separador{' '}
              <code>{csvPreview.delimiter}</code>
            </span>
            <StatusBadge tone={csvPreview.hasNameColumn ? 'success' : 'error'}>
              {csvPreview.hasNameColumn
                ? 'Cabeçalho válido detetado'
                : 'Aviso: coluna nome_completo/nome não encontrada'}
            </StatusBadge>
          </div>
          <p className="text-stone-600 font-mono truncate">
            Colunas: {csvPreview.headers.join(' | ')}
          </p>
        </Card>
      )}

      {csvStats && (
        <div className="border-t border-stone-200 pt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card variant="muted" padding="sm" className="rounded-xl text-center">
            <span className="block text-xs text-stone-500">Linhas</span>
            <span className="text-xl font-bold text-stone-900">{csvStats.total_rows}</span>
          </Card>
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
            <span className="block text-xs text-teal-700">Criados</span>
            <span className="text-xl font-bold text-teal-800">{csvStats.created_users}</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <span className="block text-xs text-amber-700">Atualizados</span>
            <span className="text-xl font-bold text-amber-800">{csvStats.updated_users}</span>
          </div>
          <Card variant="muted" padding="sm" className="rounded-xl text-center">
            <span className="block text-xs text-stone-500">Matrículas</span>
            <span className="text-xl font-bold text-stone-900">
              {csvStats.created_enrollments}
            </span>
          </Card>
        </div>
      )}
    </Card>
  );
}
