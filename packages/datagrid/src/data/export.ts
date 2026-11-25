import { escapeCsvCell } from '@simpleui/core';

import type { ColumnState } from '../model/columns.js';
import { cellValueFor } from '../view/cell-renderer.js';

/**
 * CSV export DataGrid (DG-047): header caption, guard formula, sanitasi nama
 * file, dan download aman.
 */

const SELECTION_ID = '__simpleui_selection';
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
const INVALID_FILENAME = /[\\/:*?"<>|\p{Cc}]/gu;

export interface CsvExportOptions<T extends object> {
  readonly rows: readonly T[];
  readonly columns: readonly ColumnState<T>[];
  readonly filename?: string;
  readonly delimiter?: string;
  readonly includeHeaders?: boolean;
}

export interface CsvExportResult {
  readonly content: string;
  readonly filename: string;
  readonly rowCount: number;
}

/** Nama file aman: tanpa path/karakter kontrol, tidak reserved, berakhiran .csv. */
export function sanitizeFilename(
  input: string,
  fallback = 'simpleui-export',
): string {
  const cleaned = input
    .trim()
    .replace(INVALID_FILENAME, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+/, '')
    .replace(/[.-]+$/, '');
  const base = cleaned.toLowerCase().endsWith('.csv')
    ? cleaned.slice(0, -4)
    : cleaned;
  const safe = base === '' ? fallback : base;
  const guarded = RESERVED_NAMES.test(safe) ? `_${safe}` : safe;
  return `${guarded.slice(0, 80)}.csv`;
}

function valueForExport<T extends object>(
  row: T,
  column: ColumnState<T>,
): unknown {
  const value = cellValueFor(row, column);
  if (value instanceof Date) return value.toISOString();
  return value;
}

function exportColumns<T extends object>(
  columns: readonly ColumnState<T>[],
): readonly ColumnState<T>[] {
  return columns.filter(
    (column) =>
      column.visible && !column.children && column.id !== SELECTION_ID,
  );
}

export function exportCsv<T extends object>(
  options: CsvExportOptions<T>,
): CsvExportResult {
  const delimiter = options.delimiter ?? ',';
  const columns = exportColumns(options.columns);
  const lines: string[] = [];

  if (options.includeHeaders ?? true) {
    lines.push(
      columns
        .map((column) => escapeCsvCell(column.caption, delimiter))
        .join(delimiter),
    );
  }

  for (const row of options.rows) {
    lines.push(
      columns
        .map((column) => escapeCsvCell(valueForExport(row, column), delimiter))
        .join(delimiter),
    );
  }

  return {
    content: lines.length > 0 ? `${lines.join('\r\n')}\r\n` : '',
    filename: sanitizeFilename(options.filename ?? 'simpleui-export'),
    rowCount: options.rows.length,
  };
}

/** Unduh hasil ekspor sebagai file; BOM default agar Excel membaca UTF-8. */
export function downloadCsv(
  result: CsvExportResult,
  options: { bom?: boolean } = {},
): void {
  const withBom = options.bom ?? true;
  const blob = new Blob(
    [withBom ? `\ufeff${result.content}` : result.content],
    {
      type: 'text/csv;charset=utf-8',
    },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = result.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
