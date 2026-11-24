/**
 * Pencegahan formula injection pada ekspor CSV/Excel
 * (FND-022, docs/05-security.md §4.4).
 */

/** Karakter awal yang memicu eksekusi formula di spreadsheet. */
const DANGEROUS_PREFIX = /^[=+\-@\t\r\n]/;

export interface CsvOptions {
  /** Kolom yang diekspor; default semua key pada baris pertama. */
  readonly columns?: readonly string[];
  /** Delimiter; default koma. */
  readonly delimiter?: string;
}

/**
 * Amankan satu sel: prefix `'` untuk nilai berbahaya, lalu quote bila perlu.
 * Semua nilai diperlakukan sebagai teks/angka, tidak pernah formula.
 */
export function escapeCsvCell(value: unknown, delimiter = ','): string {
  const text = value === null || value === undefined ? '' : String(value);
  const guarded = DANGEROUS_PREFIX.test(text) ? `'${text}` : text;

  const needsQuotes =
    guarded.includes(delimiter) ||
    guarded.includes('"') ||
    guarded.includes('\n') ||
    guarded.includes('\r');

  return needsQuotes ? `"${guarded.replaceAll('"', '""')}"` : guarded;
}

/** Bangun teks CSV dari baris data dengan escaping aman. */
export function toCsv(
  rows: readonly Record<string, unknown>[],
  options: CsvOptions = {},
): string {
  const delimiter = options.delimiter ?? ',';
  const columns = options.columns ?? Object.keys(rows[0] ?? {});
  if (columns.length === 0) return '';

  const lines = [
    columns.map((column) => escapeCsvCell(column, delimiter)).join(delimiter),
    ...rows.map((row) =>
      columns
        .map((column) => escapeCsvCell(row[column], delimiter))
        .join(delimiter),
    ),
  ];

  return `${lines.join('\r\n')}\r\n`;
}
