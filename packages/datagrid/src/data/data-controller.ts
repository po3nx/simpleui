import {
  ArrayStore,
  type DataStore,
  type Key,
  type KeyExpr,
  type LoadOptions,
} from '@simpleui/core';

import type { DataSourceInput } from '../api/types.js';
import { DataGridError } from '../errors.js';
import type { GridStateStore } from '../model/state.js';
import { isAbortError, isRetryable, toGridError } from './error-utils.js';

/**
 * DataController (DG-013): menjembatani state grid dengan Store core —
 * memuat data sesuai sort/filter/page, membatalkan permintaan lama, dan
 * memetakan error menjadi SUI-DG-004.
 */

export interface DataControllerOptions<T extends object> {
  readonly dataSource: DataSourceInput<T>;
  readonly keyExpr?: KeyExpr<T>;
  readonly state: GridStateStore;
  readonly paging: boolean;
  readonly events?: Readonly<Record<string, unknown>>;
}

export interface DataController<T extends object> {
  readonly store: DataStore<T>;
  load(): Promise<void>;
  getRows(): readonly T[];
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
): LoadOptions {
  const base: LoadOptions = {
    sort: state.sorting,
    ...(state.filterValue ? { filter: state.filterValue } : {}),
  };

  if (!paging) return base;
  return {
    ...base,
    skip: state.pageIndex * state.pageSize,
    take: state.pageSize,
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

interface Loader<T extends object> {
  load(): Promise<void>;
  getRows(): readonly T[];
  getTotalCount(): number;
  getError(): DataGridError | null;
  dispose(): void;
}

function createLoader<T extends object>(
  store: DataStore<T>,
  state: GridStateStore,
  paging: boolean,
  events: Readonly<Record<string, unknown>>,
): Loader<T> {
  let rows: readonly T[] = [];
  let totalCount = 0;
  let requestId = 0;
  let controller: AbortController | null = null;
  let disposed = false;
  let lastError: DataGridError | null = null;

  const emit = createEmitter(events);

  const isCurrent = (id: number): boolean => !disposed && id === requestId;

  return {
    async load() {
      if (disposed) return;

      controller?.abort();
      const current = new AbortController();
      controller = current;
      requestId += 1;
      const id = requestId;

      const loadOptions = buildLoadOptions(state.getState(), paging);
      state.setStatus('loading');
      emitLoading(emit, loadOptions);

      try {
        const result = await store.load({
          ...loadOptions,
          signal: current.signal,
        });
        if (!isCurrent(id)) return;

        rows = result.data;
        totalCount = result.totalCount ?? result.data.length;
        lastError = null;
        state.setStatus('loaded');
        emit('onDataLoaded', { data: rows, totalCount });
      } catch (error) {
        const wrapped = wrapError(error, id, current, isCurrent);
        if (!wrapped) return;
        lastError = wrapped;
        state.setStatus('error');
        emit('onDataError', { error: wrapped });
        throw wrapped;
      }
    },

    getRows: () => rows,
    getTotalCount: () => totalCount,
    getError: () => lastError,

    dispose() {
      if (disposed) return;
      disposed = true;
      controller?.abort();
      controller = null;
      requestId += 1;
    },
  };
}

export function createDataController<T extends object>(
  options: DataControllerOptions<T>,
): DataController<T> {
  const store = resolveStore(options.dataSource, options.keyExpr);
  const keyExpr = (options.keyExpr ?? store.key) as KeyExpr<T>;
  const loader = createLoader(
    store,
    options.state,
    options.paging,
    options.events ?? {},
  );

  const canRetry = (): boolean => {
    const error = loader.getError();
    return error !== null && isRetryable(error);
  };

  return {
    store,
    load: () => loader.load(),
    getRows: () => loader.getRows(),
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
