import { summarize } from '@simpleui/core';

import type { SummaryItem } from '../api/types.js';
import { DataGridError } from '../errors.js';
import { flattenColumns, type ColumnState } from '../model/columns.js';
import type { GroupNode } from './grouping.js';

/**
 * Summary engine DataGrid (DG-017): total dan per grup memakai agregasi core,
 * plus format yang aman (error formatter tidak merusak grid).
 */

export type SummaryValues = Readonly<Record<string, number>>;

export interface SummaryComputeOptions<T extends object> {
  readonly columns: readonly ColumnState<T>[];
  readonly items: readonly SummaryItem<T>[];
  readonly onError?: (error: unknown, item: SummaryItem<T>) => void;
}

function columnMap<T extends object>(
  columns: readonly ColumnState<T>[],
): Map<string, ColumnState<T>> {
  return new Map(flattenColumns(columns).map((column) => [column.id, column]));
}

function selectorFor<T extends object>(
  map: Map<string, ColumnState<T>>,
  item: SummaryItem<T>,
): string {
  const column = map.get(item.column);
  if (!column) {
    throw new DataGridError(
      'SUI-DG-001',
      `Kolom summary tidak ditemukan: ${item.column}.`,
      { path: item.column },
    );
  }
  return column.dataField ?? column.id;
}

/** Hitung summary total untuk sekumpulan baris. */
export function computeSummary<T extends object>(
  rows: readonly T[],
  options: SummaryComputeOptions<T>,
): SummaryValues {
  const map = columnMap(options.columns);
  const values: Record<string, number> = {};

  for (const item of options.items) {
    values[item.column] = summarize(
      rows,
      selectorFor(map, item),
      item.summaryType,
    );
  }

  return values;
}

/** Hitung summary untuk setiap grup (termasuk grup anak). */
export function computeGroupSummary<T extends object>(
  groups: readonly GroupNode<T>[],
  options: SummaryComputeOptions<T>,
): Map<string, SummaryValues> {
  const result = new Map<string, SummaryValues>();

  const walk = (nodes: readonly GroupNode<T>[]): void => {
    for (const node of nodes) {
      result.set(node.key, computeSummary(node.rows, options));
      if (node.children) walk(node.children);
    }
  };

  walk(groups);
  return result;
}

export interface FormatSummaryOptions<T extends object> {
  readonly value: number;
  readonly data: readonly T[];
  readonly locale?: string;
  readonly onError?: (error: unknown, item: SummaryItem<T>) => void;
}

const numberFormatters = new Map<string, Intl.NumberFormat>();

function formatterFor(locale: string): Intl.NumberFormat {
  const existing = numberFormatters.get(locale);
  if (existing) return existing;
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  });
  numberFormatters.set(locale, formatter);
  return formatter;
}

/**
 * Format nilai summary. `customizeText` yang melempar error menghasilkan `—`
 * agar satu formatter gagal tidak merusak footer/grup.
 */
export function formatSummary<T extends object>(
  item: SummaryItem<T>,
  options: FormatSummaryOptions<T>,
): string {
  if (item.customizeText) {
    try {
      return item.customizeText({ value: options.value, data: options.data });
    } catch (error) {
      options.onError?.(error, item);
      return '—';
    }
  }

  const formatted = formatterFor(options.locale ?? 'en').format(options.value);
  return item.displayFormat
    ? item.displayFormat.replaceAll('{0}', formatted)
    : formatted;
}
