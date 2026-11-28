import {
  detectDelimiter,
  normalizeHeaderKey,
  parseCsvRecords,
  type CsvAnalysisResult,
  type CsvParsedRow,
  type CsvRowIssue,
  type NormalizedRole,
} from './csvTokenizer';

export {
  decodeCsvFile,
  normalizeHeaderKey,
  type CsvAnalysisResult,
  type CsvImportStats,
  type CsvIssueSeverity,
  type CsvParsedRow,
  type CsvRowIssue,
  type NormalizedRole,
} from './csvTokenizer';

const NAME_KEYS = ['nome_completo', 'nome', 'estudante', 'aluno', 'professor'];
const BI_KEYS = ['bi_ou_processo', 'bi', 'processo', 'numero_processo', 'nif'];
const ROLE_KEYS = ['papel', 'tipo', 'funcao', 'role'];
const CLASS_KEYS = ['classe_turma', 'turma', 'classe', 'curso'];
const YEAR_KEYS = ['ano_lectivo', 'ano'];
const PHONE_KEYS = ['telefone', 'telemovel'];
const EMAIL_KEYS = ['email_pessoal', 'email'];

function pickCell(recordMap: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    if (key in recordMap && recordMap[key] !== '') return recordMap[key];
  }
  return '';
}

function resolveRole(rawRole: string): { role: NormalizedRole; recognized: boolean } {
  const upper = normalizeHeaderKey(rawRole).toUpperCase();
  if (!upper || upper.includes('ALUN') || upper.includes('ESTUD') || upper.includes('STUD')) {
    return { role: 'STUDENT', recognized: true };
  }
  if (upper.includes('PROF') || upper.includes('DOCENT') || upper.includes('TEACH')) {
    return { role: 'TEACHER', recognized: true };
  }
  if (upper.includes('ADMIN') || upper.includes('STAFF') || upper.includes('SECRET') || upper.includes('FUNC')) {
    return { role: 'STAFF', recognized: true };
  }
  return { role: 'STUDENT', recognized: false };
}

/** Parses CSV text and validates each spreadsheet line with plain-language `pt-AO` explanations. */
export function analyzeDirectoryCsv(params: {
  fileName: string;
  fileSizeBytes: number;
  text: string;
  encoding: 'UTF-8' | 'Latin-1';
  defaultAcademicYear: string;
}): CsvAnalysisResult {
  const { fileName, fileSizeBytes, text, encoding, defaultAcademicYear } = params;
  const delimiter = detectDelimiter(text);
  const records = parseCsvRecords(text, delimiter);

  const emptyBase: CsvAnalysisResult = {
    fileName,
    fileSizeBytes,
    encoding,
    delimiter,
    headers: [],
    hasNameColumn: false,
    structureError: null,
    structureHints: [],
    totalDataRows: 0,
    validRows: [],
    skippedErrorRows: [],
    warningRowsCount: 0,
    duplicateBiCount: 0,
    roleCounts: { student: 0, teacher: 0, staff: 0 },
    issues: [],
  };

  if (records.length === 0) {
    return {
      ...emptyBase,
      structureError:
        'O ficheiro selecionado está vazio. Exporte novamente a pauta no Excel ou baixe o modelo CSV de exemplo acima.',
    };
  }

  const headerCells = records[0].cells;
  const normalizedHeaders = headerCells.map(normalizeHeaderKey);
  const hasNameColumn = normalizedHeaders.some((h) => NAME_KEYS.includes(h));
  const structureHints: string[] = [];

  if (headerCells.length === 1 && headerCells[0].includes('\t')) {
    structureHints.push(
      'O ficheiro parece estar separado por tabulações. No Excel, guarde como «CSV UTF-8 (delimitado por vírgulas)» ou «CSV (separado por ponto e vírgula)».',
    );
  }

  if (!hasNameColumn) {
    return {
      ...emptyBase,
      headers: headerCells,
      structureHints,
      structureError:
        'Não encontrámos a coluna com o nome das pessoas na primeira linha. Garanta que existe uma coluna chamada «nome_completo», «nome», «aluno» ou «professor».',
    };
  }

  if (records.length === 1) {
    return {
      ...emptyBase,
      headers: headerCells,
      hasNameColumn: true,
      structureHints,
      structureError:
        'O ficheiro tem apenas o cabeçalho na linha 1 e não tem alunos ou professores listados abaixo.',
    };
  }

  const dataRecords = records.slice(1);
  const seenBiMap = new Map<string, number>();
  const validRows: CsvParsedRow[] = [];
  const skippedErrorRows: CsvParsedRow[] = [];
  const allIssues: CsvRowIssue[] = [];
  const roleCounts = { student: 0, teacher: 0, staff: 0 };
  let warningRowsCount = 0;
  let duplicateBiCount = 0;

  for (let idx = 0; idx < dataRecords.length; idx += 1) {
    const spreadsheetLine = dataRecords[idx].lineNumber;
    const cells = dataRecords[idx].cells;
    const rowMap: Record<string, string> = {};

    normalizedHeaders.forEach((key, colIdx) => {
      if (key) rowMap[key] = (cells[colIdx] || '').trim();
    });

    const fullName = pickCell(rowMap, NAME_KEYS);
    const biOrId = pickCell(rowMap, BI_KEYS);
    const roleRaw = pickCell(rowMap, ROLE_KEYS);
    const gradeClass = pickCell(rowMap, CLASS_KEYS) || 'Geral';
    const academicYear = pickCell(rowMap, YEAR_KEYS) || defaultAcademicYear;
    const phone = pickCell(rowMap, PHONE_KEYS);
    const personalEmail = pickCell(rowMap, EMAIL_KEYS);

    const { role, recognized: roleRecognized } = resolveRole(roleRaw);
    const rowIssues: CsvRowIssue[] = [];
    const displayName = fullName || '(Sem nome)';

    if (!fullName) {
      rowIssues.push({
        id: `${spreadsheetLine}-name`,
        lineNumber: spreadsheetLine,
        severity: 'error',
        fieldLabel: 'Nome completo',
        displayName,
        biOrId,
        message:
          'Nome em falta. Sem o nome completo esta linha será ignorada; preencha no Excel se quiser incluí-la.',
      });
    } else {
      if (!/[A-Za-zÀ-ÿ]/.test(fullName)) {
        rowIssues.push({
          id: `${spreadsheetLine}-name-chars`,
          lineNumber: spreadsheetLine,
          severity: 'warning',
          fieldLabel: 'Nome completo',
          displayName,
          biOrId,
          message:
            'O nome indicado não contém letras. Confirme no Excel se as colunas não ficaram desalinhadas.',
        });
      }

      if (!biOrId) {
        rowIssues.push({
          id: `${spreadsheetLine}-bi-missing`,
          lineNumber: spreadsheetLine,
          severity: 'warning',
          fieldLabel: 'BI / Processo',
          displayName,
          biOrId: 'Gerado automaticamente',
          message:
            'Sem BI nem número de processo. Será criado um código automático (PROC-...); para futuras atualizações sem duplicar, indique o BI.',
        });
      } else {
        const biNorm = biOrId.toUpperCase();
        const previousLine = seenBiMap.get(biNorm);
        if (previousLine !== undefined) {
          duplicateBiCount += 1;
          rowIssues.push({
            id: `${spreadsheetLine}-bi-dup`,
            lineNumber: spreadsheetLine,
            severity: 'warning',
            fieldLabel: 'BI repetido',
            displayName,
            biOrId,
            message: `O BI/processo «${biOrId}» já apareceu na linha ${previousLine} deste ficheiro. Os dados desta linha mais recente vão prevalecer.`,
          });
        } else {
          seenBiMap.set(biNorm, spreadsheetLine);
        }
      }

      if (roleRaw && !roleRecognized) {
        rowIssues.push({
          id: `${spreadsheetLine}-role`,
          lineNumber: spreadsheetLine,
          severity: 'warning',
          fieldLabel: 'Papel / Tipo',
          displayName,
          biOrId,
          message: `O valor «${roleRaw}» não foi reconhecido. Será importado como Estudante (use ALUNO, PROFESSOR ou FUNCIONARIO).`,
        });
      }

      if (personalEmail && (!personalEmail.includes('@') || /\s/.test(personalEmail))) {
        rowIssues.push({
          id: `${spreadsheetLine}-email`,
          lineNumber: spreadsheetLine,
          severity: 'warning',
          fieldLabel: 'E-mail pessoal',
          displayName,
          biOrId,
          message: `O e-mail «${personalEmail}» parece incompleto. A conta .edu.ao será criada, mas o convite por e-mail não poderá ser enviado.`,
        });
      }

      if (!pickCell(rowMap, CLASS_KEYS)) {
        rowIssues.push({
          id: `${spreadsheetLine}-class`,
          lineNumber: spreadsheetLine,
          severity: 'warning',
          fieldLabel: 'Turma / Dept.',
          displayName,
          biOrId,
          message: 'Sem turma ou departamento preenchido. Ficará associado a «Geral».',
        });
      }
    }

    const willSkip = !fullName;
    const parsedRow: CsvParsedRow = {
      lineNumber: spreadsheetLine,
      fullName,
      biOrId,
      roleRaw,
      role,
      gradeClass,
      academicYear,
      phone,
      personalEmail,
      issues: rowIssues,
      willSkip,
    };

    if (willSkip) {
      skippedErrorRows.push(parsedRow);
    } else {
      validRows.push(parsedRow);
      if (rowIssues.some((issue) => issue.severity === 'warning')) warningRowsCount += 1;
      if (role === 'TEACHER') roleCounts.teacher += 1;
      else if (role === 'STAFF') roleCounts.staff += 1;
      else roleCounts.student += 1;
    }

    allIssues.push(...rowIssues);
  }

  allIssues.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
    return a.lineNumber - b.lineNumber;
  });

  return {
    fileName,
    fileSizeBytes,
    encoding,
    delimiter,
    headers: headerCells,
    hasNameColumn: true,
    structureError: null,
    structureHints,
    totalDataRows: dataRecords.length,
    validRows,
    skippedErrorRows,
    warningRowsCount,
    duplicateBiCount,
    roleCounts,
    issues: allIssues,
  };
}

/** Builds a BOM-prefixed Portuguese CSV sample ready for Microsoft Excel in Angola. */
export function buildSampleDirectoryCsv(): string {
  return [
    'nome_completo;bi_ou_processo;tipo;classe_turma;ano_lectivo;telefone;email_pessoal',
    'Manuel Domingos de Sousa;008942114LA042;ALUNO;11ª Classe - CFB;2026/2027;923112233;manuel.personal@gmail.com',
    'Esperança Nzola Sebastião;007812930LA031;ALUNO;11ª Classe - CFB;2026/2027;945223344;esperanca.n@gmail.com',
    'António Baptista Mukinda;001289456HA012;PROFESSOR;Departamento de Física;2026/2027;912887766;a.mukinda@gmail.com',
  ].join('\n');
}

export function formatRoleLabel(role: NormalizedRole): string {
  if (role === 'TEACHER') return 'Docente';
  if (role === 'STAFF') return 'Funcionário';
  return 'Estudante';
}
