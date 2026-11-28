'use client';

import React, { useRef, useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import {
  AlertBanner,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
} from '@/components/ui';
import { authFetch } from '@/lib/auth';
import { downloadTextBlob } from '@/lib/downloads';
import {
  analyzeDirectoryCsv,
  buildSampleDirectoryCsv,
  decodeCsvFile,
  type CsvAnalysisResult,
  type CsvImportStats,
} from './directory/csvParser';
import { CsvConfirmImportModal, CsvImportResultCard } from './directory/CsvConfirmAndResult';
import CsvPreviewPanels from './directory/CsvPreviewPanels';
import type { FeedbackState } from './types';

interface CsvImportPanelProps {
  schoolId: string;
  loading: boolean;
  onSetLoading: (loading: boolean) => void;
  onFeedback: (fb: FeedbackState | null) => void;
  onImported: () => Promise<void>;
}

/** Bulk CSV directory import panel with line-by-line pre-validation and safe confirmation modal. */
export default function CsvImportPanel({
  schoolId,
  loading,
  onSetLoading,
  onFeedback,
  onImported,
}: CsvImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<CsvAnalysisResult | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [csvStats, setCsvStats] = useState<CsvImportStats | null>(null);

  const normalizedYear = academicYear.trim() || '2026/2027';

  const handleDownloadSampleCsv = () => {
    downloadTextBlob('\ufeff' + buildSampleDirectoryCsv(), 'turma_exemplo_angola.csv', 'text/csv;charset=utf-8;');
  };

  const resetSelectedFile = () => {
    setCsvFile(null);
    setAnalysis(null);
    setReadError(null);
    setConfirmOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCsvStats(null);
    setReadError(null);
    setConfirmOpen(false);

    if (!file) {
      setCsvFile(null);
      setAnalysis(null);
      return;
    }

    setCsvFile(file);
    try {
      const { text, encoding } = await decodeCsvFile(file);
      const parsed = analyzeDirectoryCsv({
        fileName: file.name,
        fileSizeBytes: file.size,
        text,
        encoding,
        defaultAcademicYear: normalizedYear,
      });
      setAnalysis(parsed);
    } catch {
      setAnalysis(null);
      setReadError(
        'Não foi possível ler este ficheiro no navegador. Confirme que foi guardado como .csv e tente novamente.',
      );
    }
  };

  const validCount = analysis && !analysis.structureError ? analysis.validRows.length : 0;
  const canOpenConfirm = Boolean(
    schoolId && csvFile && analysis && !analysis.structureError && validCount > 0 && !loading,
  );

  const handleRequestImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canOpenConfirm) return;
    setConfirmOpen(true);
  };

  const handleConfirmImport = async () => {
    if (!schoolId || !csvFile) return;

    onSetLoading(true);
    onFeedback(null);

    const payload = new FormData();
    payload.append('school_id', schoolId);
    payload.append('file', csvFile);
    payload.append('academic_year', normalizedYear);

    try {
      const res = await authFetch('/directory/upload-csv/', { method: 'POST', body: payload });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || JSON.stringify(result));

      setCsvStats(result.stats);
      resetSelectedFile();
      onFeedback({
        type: 'success',
        message: `Importação concluída para ${result.school}: ${result.stats?.created_users ?? 0} conta(s) nova(s) e ${result.stats?.updated_users ?? 0} atualizada(s).`,
      });
      await onImported();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao importar CSV.';
      setConfirmOpen(false);
      onFeedback({ type: 'error', message });
    } finally {
      onSetLoading(false);
    }
  };

  return (
    <Card padding="md">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <CardTitle>Importar lista de alunos e professores (CSV)</CardTitle>
          <CardDescription>
            Carregue a folha exportada do KLASSE, SysPortal, Kacennu ou Microsoft Excel. Cada linha
            é verificada antes de gravar na escola.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownloadSampleCsv}
          leftIcon={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
          className="w-full sm:w-auto shrink-0 min-h-[44px] sm:min-h-9"
        >
          Baixar modelo CSV
        </Button>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {!analysis && !csvStats && (
          <AlertBanner tone="info" title="Verificação segura antes de gravar">
            Ao escolher o ficheiro, mostramos primeiro os erros linha-a-linha e uma amostra da
            pauta. Contas já registadas com o mesmo BI ou processo são apenas atualizadas, mantendo
            palavras-passe e acessos intactos.
          </AlertBanner>
        )}

        <form onSubmit={handleRequestImport} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <FormField
              id="csv-academic-year"
              label="Ano lectivo das matrículas"
              hint="Usado quando a folha não tiver coluna ano_lectivo."
              className="md:col-span-4"
            >
              {({ id, describedBy }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2026/2027"
                  className="min-h-[44px]"
                />
              )}
            </FormField>

            <FormField
              id="csv-file-input"
              label="Ficheiro da lista (.csv)"
              required
              hint="Colunas aceites: nome_completo, bi_ou_processo, tipo, classe_turma, telefone, email_pessoal."
              className="md:col-span-8"
            >
              {({ id, describedBy }) => (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    id={id}
                    aria-describedby={describedBy}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="block w-full min-h-[44px] rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-700 file:mr-3 file:min-h-[34px] file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-stone-800 hover:file:bg-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40"
                  />
                  {csvFile && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
                      <span>
                        Selecionado: <strong className="text-stone-900">{csvFile.name}</strong> (
                        {Math.max(1, Math.round(csvFile.size / 1024))} KB)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetSelectedFile}
                        disabled={loading}
                        leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                        className="min-h-[44px] sm:min-h-8"
                      >
                        Trocar ficheiro
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </FormField>
          </div>

          {readError && (
            <AlertBanner tone="error" title="Erro ao ler o ficheiro">
              {readError}
            </AlertBanner>
          )}

          {analysis && (
            <CsvPreviewPanels
              key={`${analysis.fileName}-${analysis.fileSizeBytes}-${analysis.totalDataRows}`}
              analysis={analysis}
              onDownloadSample={handleDownloadSampleCsv}
            />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-stone-200">
            <p className="text-xs text-stone-600">
              {!csvFile
                ? 'Escolha um ficheiro .csv acima para pré-verificar os dados antes de importar.'
                : analysis?.structureError || validCount === 0
                  ? 'Corrija a estrutura indicada acima para desbloquear a importação.'
                  : analysis?.skippedErrorRows.length
                    ? `${validCount} registo(s) pronto(s) a gravar; ${analysis.skippedErrorRows.length} linha(s) sem nome serão ignoradas.`
                    : `${validCount} registo(s) verificado(s) e pronto(s) para confirmar.`}
            </p>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!canOpenConfirm}
              loading={loading}
              leftIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
              className="w-full sm:w-auto shrink-0 min-h-[44px]"
            >
              Rever e confirmar importação{validCount > 0 ? ` (${validCount})` : ''}
            </Button>
          </div>
        </form>

        {csvStats && (
          <CsvImportResultCard stats={csvStats} onDismiss={() => setCsvStats(null)} />
        )}
      </CardContent>

      <CsvConfirmImportModal
        open={confirmOpen}
        loading={loading}
        academicYear={normalizedYear}
        analysis={analysis}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmImport}
      />
    </Card>
  );
}
