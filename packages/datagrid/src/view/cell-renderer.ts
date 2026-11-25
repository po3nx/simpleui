import type { ColumnFormat } from '../api/types.js';
import type { ColumnState } from '../model/columns.js';

/**
 * Cell renderer DataGrid (DG-034): format per tipe/locale, placeholder untuk
 * null, dan penulisan teks-saja (tanpa innerHTML).
 */

export const DEFAULT_EMPTY_TEXT = '—';

export interface CellFormatOptions {
  readonly locale?: string | undefined;
  readonly placeholder?: string | undefined;
}

type FormattableColumn = Pick<ColumnState, 'dataType' | 'format'>;

const formatters = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function numberOptions(format: ColumnFormat): Intl.NumberFormatOptions {
  const digits =
    format.precision === undefined
      ? {}
      : {
          minimumFractionDigits: format.precision,
          maximumFractionDigits: format.precision,
        };

  if (format.type === 'currency') {
    return {
      style: 'currency',
      currency: format.currency ?? 'USD',
      ...digits,
    };
  }
  if (format.type === 'percent') {
    return { style: 'percent', ...digits };
  }
  return { ...digits };
}

function numberFormatter(
  locale: string,
  format: ColumnFormat,
): Intl.NumberFormat {
  const key = `n|${locale}|${JSON.stringify(format)}`;
  const cached = formatters.get(key);
  if (cached instanceof Intl.NumberFormat) return cached;
  const created = new Intl.NumberFormat(locale, numberOptions(format));
  formatters.set(key, created);
  return created;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function dateFormatter(
  locale: string,
  format: ColumnFormat,
): Intl.DateTimeFormat {
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: format.dateStyle ?? 'medium',
  };
  const key = `d|${locale}|${JSON.stringify(options)}`;
  const cached = formatters.get(key);
  if (cached instanceof Intl.DateTimeFormat) return cached;
  const created = new Intl.DateTimeFormat(locale, options);
  formatters.set(key, created);
  return created;
}

function formatNumber(
  value: unknown,
  column: FormattableColumn,
  locale: string,
): string {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'bigint'
        ? Number(value)
        : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numberFormatter(locale, column.format ?? {}).format(numeric);
}

function formatDate(
  value: unknown,
  column: FormattableColumn,
  locale: string,
): string {
  const parsed = toDate(value);
  if (!parsed) return String(value);
  return dateFormatter(locale, column.format ?? {}).format(parsed);
}

function formatValue(
  value: unknown,
  column: FormattableColumn,
  locale: string,
): string {
  switch (column.dataType) {
    case 'number':
      return formatNumber(value, column, locale);
    case 'date':
      return formatDate(value, column, locale);
    case 'boolean':
      return value ? 'Ya' : 'Tidak';
    default:
      return String(value);
  }
}

/** Format nilai sel menjadi teks; null/undefined menjadi placeholder. */
export function formatCellValue(
  value: unknown,
  column: FormattableColumn,
  options: CellFormatOptions = {},
): string {
  if (value === null || value === undefined) {
    return options.placeholder ?? DEFAULT_EMPTY_TEXT;
  }
  return formatValue(value, column, options.locale ?? 'en');
}

/** Nilai efektif baris: calculateCellValue menang atas dataField. */
export function cellValueFor<T extends object>(
  row: T,
  column: ColumnState<T>,
): unknown {
  if (column.calculateCellValue) return column.calculateCellValue(row);
  if (!column.dataField) return undefined;
  return (row as Record<string, unknown>)[column.dataField];
}

export function formatRowCell<T extends object>(
  row: T,
  column: ColumnState<T>,
  options: CellFormatOptions = {},
): string {
  return formatCellValue(cellValueFor(row, column), column, options);
}

/** Tetapkan isi sel sebagai teks murni — nilai HTML tidak pernah dieksekusi. */
export function setCellText(cell: HTMLElement, text: string): void {
  if (cell.textContent !== text) cell.textContent = text;
}
