import { applySort, type SortDescriptor } from '@simpleui/core';

import { DataGridError } from '../errors.js';
interface SortableColumn {
  readonly id: string;
  readonly dataField?: string | undefined;
  readonly allowSorting: boolean;
  readonly children: readonly unknown[] | undefined;
}

function findSortableColumn(
  columns: readonly SortableColumn[],
  id: string,
): SortableColumn | undefined {
  for (const column of columns) {
    if (column.id === id) return column;
    if (column.children) {
      const children = column.children as readonly SortableColumn[];
      const found = findSortableColumn(children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Sort model DataGrid (DG-015): siklus asc → desc → none, multi-sort yang
 * menjaga urutan descriptor, dan penerapan lewat pipeline core (collator +
 * null di akhir).
 */

export type SortDirection = 'asc' | 'desc' | null;

export interface ToggleSortOptions {
  /** true untuk Shift+klik: tambah/ubah tanpa menghapus descriptor lain. */
  readonly multi?: boolean;
}

const collators = new Map<string, Intl.Collator>();

function collatorFor(locale: string): Intl.Collator {
  const existing = collators.get(locale);
  if (existing) return existing;
  const collator = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: 'base',
  });
  collators.set(locale, collator);
  return collator;
}

function fail(message: string): never {
  throw new DataGridError('SUI-DG-001', message);
}

export function nextSortDirection(current: SortDirection): SortDirection {
  if (current === null) return 'asc';
  if (current === 'asc') return 'desc';
  return null;
}

export function sortDirectionFor(
  sortBy: readonly SortDescriptor[],
  selector: string,
): 'asc' | 'desc' | undefined {
  const descriptor = sortBy.find((item) => item.selector === selector);
  if (!descriptor) return undefined;
  return descriptor.desc ? 'desc' : 'asc';
}

/** Posisi 1-based pada indikator multi-sort; 0 bila tidak disortir. */
export function sortIndexFor(
  sortBy: readonly SortDescriptor[],
  selector: string,
): number {
  const index = sortBy.findIndex((item) => item.selector === selector);
  return index < 0 ? 0 : index + 1;
}

function resolveSelector(column: SortableColumn): string {
  if (!column.allowSorting || column.children) {
    fail(`kolom ${column.id} tidak dapat disortir`);
  }
  return column.dataField ?? column.id;
}

/** Ubah sortBy setelah klik header kolom. */
export function toggleSort(
  columns: readonly SortableColumn[],
  sortBy: readonly SortDescriptor[],
  columnId: string,
  options: ToggleSortOptions = {},
): readonly SortDescriptor[] {
  const column = findSortableColumn(columns, columnId);
  if (!column) fail(`kolom ${columnId} tidak ditemukan`);

  const selector = resolveSelector(column);
  const current = sortDirectionFor(sortBy, selector) ?? null;
  const next = nextSortDirection(current);

  if (next === null) {
    return sortBy.filter((item) => item.selector !== selector);
  }

  const descriptor: SortDescriptor = { selector, desc: next === 'desc' };

  if (!options.multi) return [descriptor];

  const exists = sortBy.some((item) => item.selector === selector);
  return exists
    ? sortBy.map((item) => (item.selector === selector ? descriptor : item))
    : [...sortBy, descriptor];
}

export function clearSort(): readonly SortDescriptor[] {
  return [];
}

/** Terapkan sort ke baris memakai pipeline core (collator + null di akhir). */
export function applyGridSort<T extends object>(
  rows: readonly T[],
  sortBy: readonly SortDescriptor[],
  locale = 'en',
): readonly T[] {
  if (sortBy.length === 0) return rows;
  return applySort(rows, sortBy, collatorFor(locale));
}
