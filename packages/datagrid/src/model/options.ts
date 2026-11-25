import { isDevMode, type KeyExpr } from '@simpleui/core';

import type {
  ColumnOptions,
  DataGridOptions,
  DataSourceInput,
  NormalizedDataGridOptions,
} from '../api/types.js';
import { DataGridError } from '../errors.js';

/**
 * Normalisasi opsi DataGrid (DG-010): default aman, validasi runtime, dan
 * penolakan key tak dikenal. Mode dev melempar `SUI-DG-001`; mode produksi
 * memakai fallback dan melaporkan lewat `onValidationError`.
 */

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface NormalizeContext {
  readonly devMode?: boolean;
  readonly onValidationError?: (issue: ValidationIssue) => void;
}

type Rule =
  | { kind: 'boolean'; fallback: boolean }
  | { kind: 'number'; fallback: number; min?: number; max?: number }
  | { kind: 'string'; fallback: string }
  | { kind: 'optionalString'; fallback: string | undefined }
  | { kind: 'enum'; values: readonly string[]; fallback: string }
  | { kind: 'stringArray'; fallback: readonly string[] }
  | { kind: 'anyArray'; fallback: readonly unknown[] }
  | { kind: 'unknown'; fallback: unknown };

const RULES: Record<string, Rule> = {
  'sorting.mode': {
    kind: 'enum',
    values: ['single', 'multiple'],
    fallback: 'single',
  },
  'sorting.sortBy': { kind: 'anyArray', fallback: [] },
  'filtering.filterValue': { kind: 'unknown', fallback: null },
  'filtering.filterRow': { kind: 'boolean', fallback: false },
  'filtering.headerFilter': { kind: 'boolean', fallback: false },
  'filtering.search.enabled': { kind: 'boolean', fallback: false },
  'filtering.search.fields': { kind: 'stringArray', fallback: [] },
  'filtering.search.debounceMs': {
    kind: 'number',
    fallback: 250,
    min: 0,
    max: 5_000,
  },
  'paging.enabled': { kind: 'boolean', fallback: false },
  'paging.pageIndex': { kind: 'number', fallback: 0, min: 0 },
  'paging.pageSize': { kind: 'number', fallback: 20, min: 1, max: 10_000 },
  'paging.pageSizes': { kind: 'anyArray', fallback: [10, 20, 50, 100] },
  'scrolling.mode': {
    kind: 'enum',
    values: ['virtual', 'standard'],
    fallback: 'virtual',
  },
  'scrolling.rowHeight': { kind: 'number', fallback: 40, min: 16, max: 200 },
  'scrolling.overscan': { kind: 'number', fallback: 5, min: 0, max: 100 },
  'scrolling.columnRenderingMode': {
    kind: 'enum',
    values: ['virtual', 'standard'],
    fallback: 'virtual',
  },
  'selection.mode': {
    kind: 'enum',
    values: ['none', 'single', 'multiple'],
    fallback: 'none',
  },
  'selection.showCheckBoxes': { kind: 'boolean', fallback: false },
  'selection.selectedRowKeys': { kind: 'anyArray', fallback: [] },
  'selection.selectAllMode': {
    kind: 'enum',
    values: ['page', 'allPages'],
    fallback: 'page',
  },
  'selection.preserveOnReload': { kind: 'boolean', fallback: true },
  'editing.mode': {
    kind: 'enum',
    values: ['none', 'row', 'cell', 'batch', 'form'],
    fallback: 'none',
  },
  'editing.allowAdding': { kind: 'boolean', fallback: false },
  'editing.allowDeleting': { kind: 'boolean', fallback: false },
  'editing.allowUpdating': { kind: 'boolean', fallback: false },
  'editing.commitOnBlur': { kind: 'boolean', fallback: true },
  'editing.confirmDelete': { kind: 'boolean', fallback: true },
  'grouping.groupBy': { kind: 'stringArray', fallback: [] },
  'grouping.autoExpandAll': { kind: 'boolean', fallback: false },
  'grouping.maxGroupCount': {
    kind: 'number',
    fallback: 100,
    min: 1,
    max: 10_000,
  },
  'summary.totalItems': { kind: 'anyArray', fallback: [] },
  'summary.groupItems': { kind: 'anyArray', fallback: [] },
  'stateStoring.enabled': { kind: 'boolean', fallback: false },
  'stateStoring.storageKey': { kind: 'string', fallback: 'simpleui-datagrid' },
  'stateStoring.storage': { kind: 'unknown', fallback: undefined },
  'stateStoring.savingTimeout': {
    kind: 'number',
    fallback: 500,
    min: 0,
    max: 10_000,
  },
  'export.allowExportSelectedData': { kind: 'boolean', fallback: false },
  'export.excludeHiddenColumns': { kind: 'boolean', fallback: true },
  'export.fileName': { kind: 'string', fallback: 'simpleui-export' },
  'display.width': { kind: 'unknown', fallback: '100%' },
  'display.height': { kind: 'unknown', fallback: 'auto' },
  'display.rtlEnabled': { kind: 'boolean', fallback: false },
  'display.showBorders': { kind: 'boolean', fallback: true },
  'display.showRowLines': { kind: 'boolean', fallback: true },
  'display.showColumnLines': { kind: 'boolean', fallback: true },
  'display.rowAlternationEnabled': { kind: 'boolean', fallback: false },
  'display.wordWrapEnabled': { kind: 'boolean', fallback: false },
  'display.focusedRowEnabled': { kind: 'boolean', fallback: false },
  'display.allowColumnResizing': { kind: 'boolean', fallback: false },
  'display.allowColumnReordering': { kind: 'boolean', fallback: false },
  'display.noDataText': { kind: 'string', fallback: 'Tidak ada data' },
  'display.locale': { kind: 'optionalString', fallback: undefined },
  'display.messages': { kind: 'unknown', fallback: {} },
};

const EVENT_KEY_LIST = [
  'onContentReady',
  'onDataLoading',
  'onDataLoaded',
  'onDataError',
  'onOptionChanged',
  'onSortingChanged',
  'onFilterChanged',
  'onPageChanged',
  'onSelectionChanged',
  'onFocusedCellChanged',
  'onRowClick',
  'onCellClick',
  'onCellDblClick',
  'onEditingStart',
  'onEditingCanceled',
  'onRowUpdating',
  'onRowUpdated',
  'onSaveFailed',
  'onExporting',
  'onExported',
  'onStateChanged',
  'onDisposing',
] as const;

const KNOWN_KEYS = new Set<string>([
  ...Object.keys(RULES).map((path) => path.split('.')[0] ?? path),
  ...EVENT_KEY_LIST,
  'dataSource',
  'keyExpr',
  'columns',
  'width',
  'height',
  'locale',
  'messages',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDataSource(value: unknown): value is DataSourceInput<unknown> {
  if (Array.isArray(value)) return true;
  return (
    isRecord(value) && typeof value['load'] === 'function' && 'key' in value
  );
}

function readInput<T>(input: DataGridOptions<T>, outputPath: string): unknown {
  const parts = outputPath.split('.');
  if (parts[0] === 'display') {
    return (input as Record<string, unknown>)[parts[1] ?? ''];
  }
  let current: unknown = input;
  for (const part of parts) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
}

function nest(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.');
    let target = result;
    for (const part of parts.slice(0, -1)) {
      const next = target[part];
      if (!isRecord(next)) target[part] = {};
      target = target[part] as Record<string, unknown>;
    }
    const last = parts[parts.length - 1];
    if (last) target[last] = value;
  }
  return result;
}

function validateKnownKeys<T>(input: DataGridOptions<T>, fail: Fail): void {
  for (const key of Object.keys(input)) {
    if (!KNOWN_KEYS.has(key)) fail(key, 'opsi tidak dikenal');
  }
}

function collectEvents<T>(
  input: DataGridOptions<T>,
  fail: Fail,
): Record<string, unknown> {
  const events: Record<string, unknown> = {};
  for (const key of EVENT_KEY_LIST) {
    const handler = (input as Record<string, unknown>)[key];
    if (handler === undefined) continue;
    if (typeof handler === 'function') events[key] = handler;
    else fail(key, 'harus fungsi');
  }
  return events;
}

export function normalizeDataGridOptions<T>(
  input: DataGridOptions<T> = {},
  context: NormalizeContext = {},
): NormalizedDataGridOptions<T> {
  const devMode = context.devMode ?? isDevMode();

  const fail = (path: string, message: string): void => {
    if (devMode) {
      throw new DataGridError('SUI-DG-001', `${path}: ${message}`, { path });
    }
    context.onValidationError?.({ path, message });
  };

  validateKnownKeys(input, fail);

  const dataSource = input.dataSource ?? [];
  if (!isDataSource(dataSource))
    fail('dataSource', 'harus array atau DataStore');

  const columns = normalizeColumns(input.columns, fail);
  const events = collectEvents(input, fail);

  const flat: Record<string, unknown> = {
    'display.width': normalizeSize(input.width, 'width', fail, '100%'),
    'display.height': normalizeSize(input.height, 'height', fail, 'auto'),
    'display.messages': isRecord(input.messages) ? input.messages : {},
  };

  for (const [path, rule] of Object.entries(RULES)) {
    if (path in flat) continue;
    flat[path] = validate(readInput(input, path), rule, path, fail);
  }

  const normalized = nest(flat) as Record<string, unknown>;
  normalized['dataSource'] = dataSource;
  normalized['keyExpr'] = resolveKeyExpr(input.keyExpr, dataSource, fail);
  normalized['columns'] = columns;
  normalized['events'] = events;

  return normalized as unknown as NormalizedDataGridOptions<T>;
}

function normalizeSize(
  value: number | string | undefined,
  path: string,
  fail: (path: string, message: string) => void,
  fallback: string,
): number | string {
  if (value === undefined) return fallback;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
    return value;
  if (typeof value === 'string' && value.length > 0) return value;
  fail(path, 'harus angka >= 0 atau string CSS');
  return fallback;
}

type Fail = (path: string, message: string) => void;
type RuleOf<K extends Rule['kind']> = Extract<Rule, { kind: K }>;

function validateBoolean(
  value: unknown,
  rule: RuleOf<'boolean'>,
  path: string,
  fail: Fail,
): unknown {
  if (typeof value === 'boolean') return value;
  fail(path, 'harus boolean');
  return rule.fallback;
}

function validateNumber(
  value: unknown,
  rule: RuleOf<'number'>,
  path: string,
  fail: Fail,
): unknown {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(path, 'harus angka');
    return rule.fallback;
  }
  const min = rule.min ?? -Infinity;
  const max = rule.max ?? Infinity;
  if (value < min || value > max) {
    fail(path, `harus di antara ${min} dan ${max}`);
    return rule.fallback;
  }
  return value;
}

function validateString(
  value: unknown,
  rule: RuleOf<'string'>,
  path: string,
  fail: Fail,
): unknown {
  if (typeof value === 'string' && value.length > 0) return value;
  fail(path, 'harus string tidak kosong');
  return rule.fallback;
}

function validateOptionalString(
  value: unknown,
  rule: RuleOf<'optionalString'>,
  path: string,
  fail: Fail,
): unknown {
  if (typeof value === 'string' && value.length > 0) return value;
  fail(path, 'harus string tidak kosong');
  return rule.fallback;
}

function validateEnum(
  value: unknown,
  rule: RuleOf<'enum'>,
  path: string,
  fail: Fail,
): unknown {
  if (typeof value === 'string' && rule.values.includes(value)) return value;
  fail(path, `harus salah satu dari: ${rule.values.join(', ')}`);
  return rule.fallback;
}

function validateStringArray(
  value: unknown,
  rule: RuleOf<'stringArray'>,
  path: string,
  fail: Fail,
): unknown {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value;
  }
  fail(path, 'harus array string');
  return rule.fallback;
}

function validateAnyArray(
  value: unknown,
  rule: RuleOf<'anyArray'>,
  path: string,
  fail: Fail,
): unknown {
  if (Array.isArray(value)) return value;
  fail(path, 'harus array');
  return rule.fallback;
}

function validate(
  value: unknown,
  rule: Rule,
  path: string,
  fail: Fail,
): unknown {
  if (value === undefined) return rule.fallback;

  switch (rule.kind) {
    case 'boolean':
      return validateBoolean(value, rule, path, fail);
    case 'number':
      return validateNumber(value, rule, path, fail);
    case 'string':
      return validateString(value, rule, path, fail);
    case 'optionalString':
      return validateOptionalString(value, rule, path, fail);
    case 'enum':
      return validateEnum(value, rule, path, fail);
    case 'stringArray':
      return validateStringArray(value, rule, path, fail);
    case 'anyArray':
      return validateAnyArray(value, rule, path, fail);
    case 'unknown':
      return value;
  }
}

function isValidKeyExpr(value: unknown): boolean {
  if (typeof value === 'string' || typeof value === 'function') return true;
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function keyFromStore<T>(
  dataSource: DataSourceInput<T>,
): KeyExpr<T> | undefined {
  if (Array.isArray(dataSource) || !isRecord(dataSource)) return undefined;
  const key = (dataSource as Record<string, unknown>)['key'];
  return typeof key === 'string' || Array.isArray(key)
    ? (key as KeyExpr<T>)
    : undefined;
}

function keyFromRows<T>(
  dataSource: DataSourceInput<T>,
): KeyExpr<T> | undefined {
  const first = Array.isArray(dataSource) ? dataSource[0] : undefined;
  return isRecord(first) && 'id' in first ? ('id' as KeyExpr<T>) : undefined;
}

function resolveKeyExpr<T>(
  value: DataGridOptions<T>['keyExpr'],
  dataSource: DataSourceInput<T>,
  fail: Fail,
): KeyExpr<T> | undefined {
  if (value !== undefined) {
    if (!isValidKeyExpr(value)) {
      fail('keyExpr', 'harus string, array string, atau fungsi');
      return undefined;
    }
    return value as KeyExpr<T>;
  }
  return keyFromStore(dataSource) ?? keyFromRows(dataSource);
}

function normalizeColumns<T>(
  value: readonly ColumnOptions<T>[] | undefined,
  fail: (path: string, message: string) => void,
): readonly ColumnOptions<T>[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    fail('columns', 'harus array');
    return [];
  }

  const columns: ColumnOptions<T>[] = [];
  value.forEach((column, index) => {
    if (!isRecord(column)) {
      fail(`columns[${index}]`, 'harus objek');
      return;
    }
    if (
      column.width !== undefined &&
      !(typeof column.width === 'number' && column.width > 0)
    ) {
      fail(`columns[${index}].width`, 'harus angka > 0');
    }
    if (
      column.dataField !== undefined &&
      typeof column.dataField !== 'string'
    ) {
      fail(`columns[${index}].dataField`, 'harus string');
    }
    columns.push(column);
  });

  return columns;
}
