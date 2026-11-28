export type CsvIssueSeverity = 'error' | 'warning';

export type NormalizedRole = 'STUDENT' | 'TEACHER' | 'STAFF';

export interface CsvRowIssue {
  id: string;
  lineNumber: number;
  severity: CsvIssueSeverity;
  fieldLabel: string;
  displayName: string;
  biOrId: string;
  message: string;
}

export interface CsvParsedRow {
  lineNumber: number;
  fullName: string;
  biOrId: string;
  roleRaw: string;
  role: NormalizedRole;
  gradeClass: string;
  academicYear: string;
  phone: string;
  personalEmail: string;
  issues: CsvRowIssue[];
  willSkip: boolean;
}

export interface CsvAnalysisResult {
  fileName: string;
  fileSizeBytes: number;
  encoding: 'UTF-8' | 'Latin-1';
  delimiter: ';' | ',';
  headers: string[];
  hasNameColumn: boolean;
  structureError: string | null;
  structureHints: string[];
  totalDataRows: number;
  validRows: CsvParsedRow[];
  skippedErrorRows: CsvParsedRow[];
  warningRowsCount: number;
  duplicateBiCount: number;
  roleCounts: {
    student: number;
    teacher: number;
    staff: number;
  };
  issues: CsvRowIssue[];
}

export interface CsvImportStats {
  total_rows: number;
  created_users: number;
  updated_users: number;
  created_enrollments: number;
  errors: string[];
}

/** Removes accents and normalizes spacing to match `CSVImporterService` header aliases. */
export function normalizeHeaderKey(value: string): string {
  return value
    .replace(/^\ufeff/, '')
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/** Decodes uploaded CSV bytes using UTF-8 first, falling back to Latin-1 for Windows/Excel ANSI exports. */
export async function decodeCsvFile(file: File): Promise<{ text: string; encoding: 'UTF-8' | 'Latin-1' }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const start = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  const contentBytes = start > 0 ? bytes.subarray(start) : bytes;

  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return { text: decoder.decode(contentBytes), encoding: 'UTF-8' };
  } catch {
    const decoder = new TextDecoder('iso-8859-1');
    return { text: decoder.decode(contentBytes), encoding: 'Latin-1' };
  }
}

export function detectDelimiter(text: string): ';' | ',' {
  const sample = text.slice(0, 1024);
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

/** Tokenizes quoted CSV text into spreadsheet rows preserving exact 1-based line numbers. */
export function parseCsvRecords(
  text: string,
  delimiter: ';' | ',',
): Array<{ lineNumber: number; cells: string[] }> {
  const records: Array<{ lineNumber: number; cells: string[] }> = [];
  let currentCells: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let currentLine = 1;
  let recordStartLine = 1;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === '\n') currentLine += 1;
        currentField += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      currentCells.push(currentField.trim());
      currentField = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      currentCells.push(currentField.trim());
      if (currentCells.length > 1 || currentCells[0].length > 0) {
        records.push({ lineNumber: recordStartLine, cells: currentCells });
      }
      currentCells = [];
      currentField = '';
      currentLine += 1;
      recordStartLine = currentLine;
    } else {
      currentField += ch;
    }
  }

  currentCells.push(currentField.trim());
  if (currentCells.length > 1 || currentCells[0].length > 0) {
    records.push({ lineNumber: recordStartLine, cells: currentCells });
  }

  return records;
}
