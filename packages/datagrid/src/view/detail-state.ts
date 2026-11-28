import type { Key } from '@simpleui/core';
import type { DetailState, MasterDetailOptions } from './detail-view.js';

/** State machine expand/load detail (DG-068), terpisah dari renderer. */
export interface DetailRuntime<T extends object> {
  readonly rows: readonly T[];
  readonly options: MasterDetailOptions<T> | undefined;
  readonly keyOf: (row: T) => Key;
  readonly expanded: Set<string>;
  readonly states: Map<Key, DetailState>;
  readonly rowsChanged: () => void;
}

export function toggleDetail<T extends object>(
  runtime: DetailRuntime<T>,
  key: Key,
): void {
  if (!runtime.options?.enabled) return;
  const stringKey = String(key);
  const expanding = !runtime.expanded.has(stringKey);
  if (expanding) runtime.expanded.add(stringKey);
  else runtime.expanded.delete(stringKey);
  if (expanding && !runtime.states.has(key)) {
    runtime.states.set(key, { status: 'loading' });
    void loadDetail(runtime, key);
  }
  runtime.rowsChanged();
}

export async function loadDetail<T extends object>(
  runtime: DetailRuntime<T>,
  key: Key,
): Promise<void> {
  const detail = runtime.options;
  const row = runtime.rows.find((entry) =>
    Object.is(runtime.keyOf(entry), key),
  );
  if (!detail?.load || !row) {
    runtime.states.set(key, { status: 'loaded' });
    runtime.rowsChanged();
    return;
  }
  try {
    const data = await detail.load(row, key);
    runtime.states.set(key, { status: 'loaded', data });
  } catch (error) {
    runtime.states.set(key, { status: 'error', error });
  }
  runtime.rowsChanged();
}
