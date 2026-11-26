import {
  ArrayStore,
  applyFilter,
  applyPage,
  applySort,
  type DataStore,
  type Key,
  type KeyExpr,
  type LoadOptions,
  type LoadResult,
} from '@simpleui/core';

import type { DataSourceInput } from '../api/types.js';
import { DataGridError } from '../errors.js';
import type { GridStateStore } from '../model/state.js';
import { isAbortError, isRetryable, toGridError } from './error-utils.js';
import { groupRows, type GroupNode, type GroupOptions } from './grouping.js';

/**
 * DataController (DG-013): menjembatani state grid dengan Store core —
 * memuat data sesuai sort/filter/page, membatalkan permintaan lama, dan
 * memetakan error menjadi SUI-DG-004.
 */

export interface RemoteOperationsConfig {
  readonly filtering?: boolean;
  readonly sorting?: boolean;
  readonly grouping?: boolean;
  readonly paging?: boolean;
}

export type RemoteOperationsOption = boolean | 'auto' | RemoteOperationsConfig;

export interface DataControllerOptions<T extends object> {
  readonly dataSource: DataSourceInput<T>;
  readonly keyExpr?: KeyExpr<T>;
  readonly state: GridStateStore;
  readonly paging: boolean;
  readonly events?: Readonly<Record<string, unknown>>;
  readonly remoteOperations?: RemoteOperationsOption;
  readonly grouping?: GroupOptions;
  readonly locale?: string;
}

interface EffectiveRemoteOperations {
  readonly filtering: boolean;
  readonly sorting: boolean;
  readonly grouping: boolean;
  readonly paging: boolean;
}

function resolveRemoteOperations(
  option: RemoteOperationsOption | undefined,
  capabilities: DataStore<unknown>['capabilities'],
): EffectiveRemoteOperations {
  const auto = {
    filtering: capabilities.filter,
    sorting: capabilities.sort,
    grouping: capabilities.group,
    paging: capabilities.paging,
  };
  if (option === false) {
    return { filtering: false, sorting: false, grouping: false, paging: false };
  }
  if (option === true) return auto;
  const config = typeof option === 'object' ? option : {};
  return {
    filtering: (config.filtering ?? auto.filtering) && capabilities.filter,
    sorting: (config.sorting ?? auto.sorting) && capabilities.sort,
    grouping: (config.grouping ?? auto.grouping) && capabilities.group,
    paging: (config.paging ?? auto.paging) && capabilities.paging,
  };
}

export interface DataController<T extends object> {
  readonly store: DataStore<T>;
  load(): Promise<void>;
  getRows(): readonly T[];
  getGroups(): readonly GroupNode<T>[];
  getTotalCount(): number;
  getRowByKey(key: Key): T | undefined;
  getKey(row: T): Key;
  getError(): DataGridError | null;
  canRetry(): boolean;
  retry(): Promise<void>;
  dispose(): void;
}

type EventHandler = (payload: unknown) => void;

function resolveStore<T extends object>(
  dataSource: DataSourceInput<T>,
  keyExpr: KeyExpr<T> | undefined,
): DataStore<T> {
  if (!Array.isArray(dataSource)) return dataSource as DataStore<T>;

  const key = keyExpr ?? inferKey(dataSource);
  if (!key) {
    throw new DataGridError(
      'SUI-DG-003',
      'keyExpr diperlukan untuk data tanpa field "id".',
      { path: 'keyExpr' },
    );
  }
  return new ArrayStore<T>(dataSource, { key: key as KeyExpr<T> });
}

function inferKey<T extends object>(
  rows: readonly T[],
): KeyExpr<T> | undefined {
  const first = rows[0];
  return typeof first === 'object' && first !== null && 'id' in first
    ? ('id' as KeyExpr<T>)
    : undefined;
}

function keyOf<T extends object>(keyExpr: KeyExpr<T>, row: T): Key {
  if (typeof keyExpr === 'function') return keyExpr(row);
  if (Array.isArray(keyExpr)) {
    return keyExpr
      .map((field) => String((row as Record<PropertyKey, unknown>)[field]))
      .join('\u0000');
  }
  return (row as Record<PropertyKey, unknown>)[keyExpr as PropertyKey] as Key;
}

function buildLoadOptions(
  state: ReturnType<GridStateStore['getState']>,
  paging: boolean,
  operations: EffectiveRemoteOperations,
): LoadOptions {
  const base: LoadOptions = {
    ...(operations.sorting ? { sort: state.sorting } : {}),
    ...(operations.filtering && state.filterValue
      ? { filter: state.filterValue }
      : {}),
    ...(operations.grouping && state.groupBy.length > 0
      ? {
          group: state.groupBy.map((selector) => ({ selector })),
          requireGroupCount: true,
        }
      : {}),
  };
  if (!paging || !operations.paging) return base;
  return {
    ...base,
    skip: state.pageIndex * state.pageSize,
    take: state.pageSize,
    requireTotalCount: true,
  };
}

interface LocalQuery<T extends object> {
  readonly rows: readonly T[];
  readonly state: ReturnType<GridStateStore['getState']>;
  readonly paging: boolean;
  readonly operations: EffectiveRemoteOperations;
  readonly grouping: GroupOptions | undefined;
  readonly collator: Intl.Collator;
}

interface LocalQueryResult<T extends object> {
  readonly rows: readonly T[];
  readonly groups: readonly GroupNode<T>[];
  readonly totalCount: number;
}

function applyLocalQuery<T extends object>(
  query: LocalQuery<T>,
): LocalQueryResult<T> {
  const { rows, state, paging, operations, grouping, collator } = query;
  const filtered = operations.filtering
    ? rows
    : applyFilter(rows, state.filterValue ?? undefined, collator);
  const sorted = operations.sorting
    ? filtered
    : applySort(filtered, state.sorting, collator);
  const groups =
    state.groupBy.length > 0 && !operations.grouping
      ? groupRows(sorted, state.groupBy, grouping)
      : [];
  const paged =
    paging && !operations.paging
      ? applyPage(sorted, state.pageIndex * state.pageSize, state.pageSize)
      : sorted;
  return {
    rows: paged,
    groups,
    totalCount: paging && !operations.paging ? sorted.length : rows.length,
  };
}

function wrapError(
  error: unknown,
  id: number,
  current: AbortController,
  isCurrent: (id: number) => boolean,
): DataGridError | null {
  if (!isCurrent(id) || current.signal.aborted || isAbortError(error)) {
    return null;
  }
  return toGridError(error);
}

function createEmitter(
  events: Readonly<Record<string, unknown>>,
): (name: string, payload: unknown) => void {
  return (name, payload) => {
    const handler = events[name];
    if (typeof handler !== 'function') return;
    try {
      (handler as EventHandler)(payload);
    } catch {
      // Handler consumer tidak boleh merusak pemuatan data.
    }
  };
}

function emitLoading(
  emit: (name: string, payload: unknown) => void,
  loadOptions: LoadOptions,
): void {
  emit('onDataLoading', {
    loadOptions: { skip: loadOptions.skip ?? 0, take: loadOptions.take ?? 0 },
  });
}

interface LoaderContext<T extends object> {
  readonly store: DataStore<T>;
  readonly state: GridStateStore;
  readonly paging: boolean;
  readonly events: Readonly<Record<string, unknown>>;
  readonly operations: EffectiveRemoteOperations;
  readonly grouping: GroupOptions | undefined;
  readonly collator: Intl.Collator;
}

interface LoadOutcome<T extends object> {
  readonly rows: readonly T[];
  readonly groups: readonly GroupNode<T>[];
  readonly totalCount: number;
}

function applyLoadResult<T extends object>(
  context: LoaderContext<T>,
  result: LoadResult<T>,
): LoadOutcome<T> {
  const local = applyLocalQuery({
    rows: result.data,
    state: context.state.getState(),
    paging: context.paging,
    operations: context.operations,
    grouping: context.grouping,
    collator: context.collator,
  });
  return {
    rows: local.rows,
    groups: local.groups,
    totalCount:
      context.paging && context.operations.paging
        ? (result.totalCount ?? result.data.length)
        : local.totalCount,
  };
}

interface Loader<T extends object> {
  load(): Promise<void>;
  getRows(): readonly T[];
  getGroups(): readonly GroupNode<T>[];
  getTotalCount(): number;
  getError(): DataGridError | null;
  dispose(): void;
}

interface LoaderRuntime<T extends object> {
  rows: readonly T[];
  groups: readonly GroupNode<T>[];
  totalCount: number;
  requestId: number;
  controller: AbortController | null;
  disposed: boolean;
  lastError: DataGridError | null;
  readonly emit: (name: string, payload: unknown) => void;
}

async function loadOnce<T extends object>(
  context: LoaderContext<T>,
  runtime: LoaderRuntime<T>,
): Promise<void> {
  const { store, state, paging, operations } = context;
  if (runtime.disposed) return;

  runtime.controller?.abort();
  const current = new AbortController();
  runtime.controller = current;
  runtime.requestId += 1;
  const id = runtime.requestId;
  const isCurrent = (): boolean =>
    !runtime.disposed && id === runtime.requestId;

  const loadOptions = buildLoadOptions(state.getState(), paging, operations);
  state.setStatus('loading');
  emitLoading(runtime.emit, loadOptions);

  try {
    const result = await store.load({ ...loadOptions, signal: current.signal });
    if (!isCurrent()) return;

    const outcome = applyLoadResult(context, result);
    runtime.rows = outcome.rows;
    runtime.groups = outcome.groups;
    runtime.totalCount = outcome.totalCount;
    runtime.lastError = null;
    state.setStatus('loaded');
    runtime.emit('onDataLoaded', {
      data: runtime.rows,
      totalCount: runtime.totalCount,
    });
  } catch (error) {
    const wrapped = wrapError(error, id, current, isCurrent);
    if (!wrapped) return;
    runtime.lastError = wrapped;
    state.setStatus('error');
    runtime.emit('onDataError', { error: wrapped });
    throw wrapped;
  }
}

function createLoader<T extends object>(context: LoaderContext<T>): Loader<T> {
  const runtime: LoaderRuntime<T> = {
    rows: [],
    groups: [],
    totalCount: 0,
    requestId: 0,
    controller: null,
    disposed: false,
    lastError: null,
    emit: createEmitter(context.events),
  };
  return {
    load: () => loadOnce(context, runtime),
    getRows: () => runtime.rows,
    getGroups: () => runtime.groups,
    getTotalCount: () => runtime.totalCount,
    getError: () => runtime.lastError,
    dispose: () => {
      if (runtime.disposed) return;
      runtime.disposed = true;
      runtime.controller?.abort();
      runtime.controller = null;
      runtime.requestId += 1;
    },
  };
}

export function createDataController<T extends object>(
  options: DataControllerOptions<T>,
): DataController<T> {
  const store = resolveStore(options.dataSource, options.keyExpr);
  const keyExpr = (options.keyExpr ?? store.key) as KeyExpr<T>;
  const operations = resolveRemoteOperations(
    options.remoteOperations,
    store.capabilities as DataStore<unknown>['capabilities'],
  );
  const loader = createLoader({
    store,
    state: options.state,
    paging: options.paging,
    events: options.events ?? {},
    operations,
    grouping: options.grouping,
    collator: new Intl.Collator(options.locale),
  });

  const canRetry = (): boolean => {
    const error = loader.getError();
    return error !== null && isRetryable(error);
  };

  return {
    store,
    load: () => loader.load(),
    getRows: () => loader.getRows(),
    getGroups: () => loader.getGroups(),
    getTotalCount: () => loader.getTotalCount(),
    getRowByKey: (key) =>
      loader.getRows().find((row) => Object.is(keyOf(keyExpr, row), key)),
    getKey: (row) => keyOf(keyExpr, row),
    getError: () => loader.getError(),
    canRetry,
    retry: async () => {
      if (!canRetry()) return;
      await loader.load();
    },
    dispose: () => loader.dispose(),
  };
}
