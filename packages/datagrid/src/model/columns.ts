import { isDevMode, type TemplateRenderer } from '@simpleui/core';

import type {
  ColumnAlignment,
  ColumnDataType,
  ColumnFormat,
  ColumnOptions,
} from '../api/types.js';
import { DataGridError } from '../errors.js';

/**
 * Column model (DG-011): normalisasi input kolom menjadi pohon `ColumnState`
 * dengan id stabil, band, visibility, dan resolusi lebar.
 */

export type ColumnInput<T = unknown> = string | ColumnOptions<T>;

export interface ColumnState<T = unknown> {
  readonly id: string;
  readonly dataField: string | undefined;
  readonly caption: string;
  readonly dataType: ColumnDataType;
  readonly width: number | 'auto';
  readonly minWidth: number;
  readonly maxWidth: number | undefined;
  readonly alignment: ColumnAlignment;
  readonly fixed: 'start' | 'end' | undefined;
  readonly visible: boolean;
  readonly allowSorting: boolean;
  readonly allowFiltering: boolean;
  readonly allowEditing: boolean;
  readonly allowResizing: boolean;
  readonly allowReordering: boolean;
  readonly allowHiding: boolean;
  readonly format: ColumnFormat | undefined;
  readonly cellTemplate: TemplateRenderer | undefined;
  readonly headerCellTemplate: TemplateRenderer | undefined;
  readonly calculateCellValue: ((row: T) => unknown) | undefined;
  readonly bandId: string | undefined;
  readonly depth: number;
  readonly children: readonly ColumnState<T>[] | undefined;
}

export interface ColumnModelContext {
  readonly devMode?: boolean;
  readonly onValidationError?: (issue: {
    path: string;
    message: string;
  }) => void;
}

const DEFAULT_MIN_WIDTH = 80;

function fail(
  context: ColumnModelContext,
  path: string,
  message: string,
  code: 'SUI-DG-001' | 'SUI-DG-002' = 'SUI-DG-001',
): void {
  if (context.devMode ?? isDevMode()) {
    throw new DataGridError(code, `${path}: ${message}`, { path });
  }
  context.onValidationError?.({ path, message });
}

function defaultAlignment(dataType: ColumnDataType): ColumnAlignment {
  if (dataType === 'number' || dataType === 'currency') return 'end';
  if (dataType === 'boolean') return 'center';
  return 'start';
}

function normalizeFixed(
  value: 'start' | 'end' | boolean | undefined,
  path: string,
  context: ColumnModelContext,
): 'start' | 'end' | undefined {
  if (value === undefined || value === false) return undefined;
  if (value === true) return 'start';
  if (value === 'start' || value === 'end') return value;
  fail(context, path, 'harus true/false/"start"/"end"');
  return undefined;
}

interface ColumnSizing {
  readonly width?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
}

function normalizeWidth(
  column: ColumnSizing,
  path: string,
  context: ColumnModelContext,
): { width: number | 'auto'; minWidth: number; maxWidth: number | undefined } {
  const minWidth = column.minWidth ?? DEFAULT_MIN_WIDTH;
  if (!Number.isFinite(minWidth) || minWidth <= 0) {
    fail(context, `${path}.minWidth`, 'harus angka > 0');
  }
  const maxWidth = column.maxWidth;
  if (
    maxWidth !== undefined &&
    (!Number.isFinite(maxWidth) || maxWidth < minWidth)
  ) {
    fail(context, `${path}.maxWidth`, 'harus >= minWidth');
  }

  if (column.width === undefined) {
    return { width: 'auto', minWidth, maxWidth };
  }
  if (!Number.isFinite(column.width) || column.width <= 0) {
    fail(context, `${path}.width`, 'harus angka > 0 atau "auto"');
    return { width: 'auto', minWidth, maxWidth };
  }

  const clamped = Math.min(
    Math.max(column.width, minWidth),
    maxWidth ?? Number.POSITIVE_INFINITY,
  );
  return { width: clamped, minWidth, maxWidth };
}

interface BuildContext {
  readonly index: number;
  readonly depth: number;
  readonly bandId: string | undefined;
  readonly context: ColumnModelContext;
  readonly usedIds: Set<string>;
}

type ColumnFlags = {
  readonly allowSorting?: boolean;
  readonly allowFiltering?: boolean;
  readonly allowEditing?: boolean;
  readonly allowResizing?: boolean;
  readonly allowReordering?: boolean;
  readonly allowHiding?: boolean;
};

const FLAG_KEYS = [
  'allowSorting',
  'allowFiltering',
  'allowEditing',
  'allowResizing',
  'allowReordering',
  'allowHiding',
] as const;

type FlagKey = (typeof FLAG_KEYS)[number];

function resolveFlags(column: ColumnFlags): Record<FlagKey, boolean> {
  const flags: Record<FlagKey, boolean> = {
    allowSorting: true,
    allowFiltering: true,
    allowEditing: true,
    allowResizing: true,
    allowReordering: true,
    allowHiding: true,
  };

  for (const key of FLAG_KEYS) {
    const value = column[key];
    if (typeof value === 'boolean') flags[key] = value;
  }
  return flags;
}

function resolveCaption<T>(
  column: ColumnOptions<T>,
  dataField: string | undefined,
  index: number,
): string {
  if (column.caption) return column.caption;
  return dataField ?? `Kolom ${index + 1}`;
}

function buildChildren<T>(
  column: ColumnOptions<T>,
  parentId: string,
  build: BuildContext,
): readonly ColumnState<T>[] | undefined {
  if (!Array.isArray(column.columns) || column.columns.length === 0) {
    return undefined;
  }
  return column.columns.map((child, index) =>
    buildColumn(child, {
      index,
      depth: build.depth + 1,
      bandId: parentId,
      context: build.context,
      usedIds: build.usedIds,
    }),
  );
}

function buildColumn<T>(
  input: ColumnInput<T>,
  build: BuildContext,
): ColumnState<T> {
  const path = `columns[${build.index}]`;
  const column: ColumnOptions<T> =
    typeof input === 'string' ? { dataField: input } : input;
  const dataField =
    typeof column.dataField === 'string' ? column.dataField : undefined;
  const id = uniqueId(
    column.id ?? dataField ?? `col-${build.index}`,
    path,
    build.context,
    build.usedIds,
  );

  const children = buildChildren(column, id, build);
  if (children && dataField !== undefined) {
    fail(build.context, path, 'band tidak boleh punya dataField');
  }

  const dataType = column.dataType ?? 'string';
  const { width, minWidth, maxWidth } = normalizeWidth(
    column,
    path,
    build.context,
  );
  const flags = resolveFlags(column);

  return {
    id,
    dataField,
    caption: resolveCaption(column, dataField, build.index),
    dataType,
    width: children ? 'auto' : width,
    minWidth,
    maxWidth,
    alignment: column.alignment ?? defaultAlignment(dataType),
    fixed: normalizeFixed(column.fixed, `${path}.fixed`, build.context),
    visible: column.visible ?? true,
    ...flags,
    format: column.format,
    cellTemplate: column.cellTemplate,
    headerCellTemplate: column.headerCellTemplate,
    calculateCellValue: column.calculateCellValue,
    bandId: build.bandId,
    depth: build.depth,
    children,
  };
}

function uniqueId(
  candidate: string,
  path: string,
  context: ColumnModelContext,
  usedIds: Set<string>,
): string {
  if (!usedIds.has(candidate)) {
    usedIds.add(candidate);
    return candidate;
  }

  fail(context, path, `id kolom duplikat: ${candidate}`, 'SUI-DG-002');
  let suffix = 2;
  while (usedIds.has(`${candidate}-${suffix}`)) suffix += 1;
  const renamed = `${candidate}-${suffix}`;
  usedIds.add(renamed);
  return renamed;
}

/** Normalisasi daftar kolom menjadi pohon ColumnState. */
export function normalizeColumnModel<T>(
  columns: readonly ColumnInput<T>[] = [],
  context: ColumnModelContext = {},
): readonly ColumnState<T>[] {
  const usedIds = new Set<string>();
  return columns.map((column, index) =>
    buildColumn(column, {
      index,
      depth: 0,
      bandId: undefined,
      context,
      usedIds,
    }),
  );
}

/** Semua leaf column, depth-first (band tidak dihitung). */
export function flattenColumns<T>(
  columns: readonly ColumnState<T>[],
): readonly ColumnState<T>[] {
  return columns.flatMap((column) =>
    column.children ? flattenColumns(column.children) : [column],
  );
}

/** Leaf yang terlihat; band tersembunyi menyembunyikan seluruh isinya. */
export function getVisibleColumns<T>(
  columns: readonly ColumnState<T>[],
  bandVisible = true,
): readonly ColumnState<T>[] {
  return columns.flatMap((column) => {
    const visible = bandVisible && column.visible;
    if (column.children) return getVisibleColumns(column.children, visible);
    return visible ? [column] : [];
  });
}

/** Cari kolom (band atau leaf) berdasarkan id. */
export function findColumnById<T>(
  columns: readonly ColumnState<T>[],
  id: string,
): ColumnState<T> | undefined {
  for (const column of columns) {
    if (column.id === id) return column;
    if (column.children) {
      const found = findColumnById(column.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/** Jumlah baris header yang dibutuhkan pohon kolom. */
export function countHeaderRows<T>(columns: readonly ColumnState<T>[]): number {
  return columns.reduce((rows, column) => {
    if (!column.children) return Math.max(rows, 1);
    return Math.max(rows, 1 + countHeaderRows(column.children));
  }, 0);
}
