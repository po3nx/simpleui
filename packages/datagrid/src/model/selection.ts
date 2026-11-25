import type { Key } from '@simpleui/core';

import type { SelectionChangedEvent, SelectionMode } from '../api/types.js';
import { DataGridError } from '../errors.js';
import { buildKeyIndex, encodeKey, type KeyResolver } from './key.js';
import type { GridStateStore } from './state.js';

/**
 * Selection model DataGrid (DG-020): key-based, mode none/single/multiple,
 * range, select-all per halaman/semua, dan rekonsiliasi setelah reload.
 */

export interface SelectionModelOptions<T extends object> {
  readonly state: GridStateStore;
  readonly mode?: SelectionMode;
  readonly selectAllMode?: 'page' | 'allPages';
  readonly supportsSelectAllPages?: boolean;
  readonly onChange?: (event: SelectionChangedEvent) => void;
  readonly resolver?: KeyResolver<T>;
}

export interface SelectionModel {
  getSelectedKeys(): readonly Key[];
  setSelectedKeys(keys: readonly Key[]): void;
  toggle(key: Key): void;
  selectRange(
    orderedKeys: readonly Key[],
    fromIndex: number,
    toIndex: number,
  ): void;
  selectAll(keys: readonly Key[], scope?: 'page' | 'allPages'): void;
  clear(): void;
  reconcile<T extends object>(
    rows: readonly T[],
    resolver: KeyResolver<T>,
  ): void;
  dispose(): void;
}

function sameKeys(first: readonly Key[], second: readonly Key[]): boolean {
  if (first.length !== second.length) return false;
  const set = new Set(first);
  return second.every((key) => set.has(key));
}

function createChangeTracker(
  state: GridStateStore,
  onChange: ((event: SelectionChangedEvent) => void) | undefined,
): () => void {
  let previous: readonly Key[] = state.getState().selection;

  return state.subscribe((next) => {
    const nextSelection = next.selection;
    if (sameKeys(previous, nextSelection)) return;

    const previousSet = new Set(previous);
    const nextSet = new Set(nextSelection);
    const added = nextSelection.filter((key) => !previousSet.has(key));
    const removed = previous.filter((key) => !nextSet.has(key));
    previous = nextSelection;

    onChange?.({ selectedRowKeys: [...nextSelection], added, removed });
  });
}

function applySelection(
  state: GridStateStore,
  mode: SelectionMode,
  keys: readonly Key[],
): void {
  if (mode === 'none') return;
  state.setSelection(mode === 'single' ? keys.slice(-1) : keys);
}

function toggleKey(state: GridStateStore, mode: SelectionMode, key: Key): void {
  if (mode === 'none') return;
  if (mode === 'single') {
    if (state.getState().selection.includes(key)) state.clearSelection();
    else state.toggleSelection(key, 'single');
    return;
  }
  state.toggleSelection(key, 'multiple');
}

function rangeKeys(
  orderedKeys: readonly Key[],
  fromIndex: number,
  toIndex: number,
): readonly Key[] {
  const start = Math.max(0, Math.min(fromIndex, toIndex));
  const end = Math.min(orderedKeys.length - 1, Math.max(fromIndex, toIndex));
  return end < start ? [] : orderedKeys.slice(start, end + 1);
}

interface SelectAllContext {
  readonly scope: 'page' | 'allPages';
  readonly supportsAllPages: boolean;
}

function selectAllKeys(
  state: GridStateStore,
  mode: SelectionMode,
  keys: readonly Key[],
  context: SelectAllContext,
): void {
  if (mode === 'none') return;
  if (context.scope === 'allPages' && !context.supportsAllPages) {
    throw new DataGridError(
      'SUI-DG-009',
      'Store tidak mendukung select all lintas halaman.',
    );
  }
  if (mode === 'single') {
    state.setSelection(keys.slice(-1));
    return;
  }
  state.selectAll(keys);
}

export function createSelectionModel<T extends object>(
  options: SelectionModelOptions<T>,
): SelectionModel {
  const mode: SelectionMode = options.mode ?? 'multiple';
  const scope = options.selectAllMode ?? 'page';
  let disposed = false;
  const unsubscribe = createChangeTracker(options.state, options.onChange);

  return {
    getSelectedKeys: () => [...options.state.getState().selection],
    setSelectedKeys: (keys) => applySelection(options.state, mode, keys),
    toggle: (key) => toggleKey(options.state, mode, key),

    selectRange(orderedKeys, fromIndex, toIndex) {
      applySelection(
        options.state,
        mode,
        rangeKeys(orderedKeys, fromIndex, toIndex),
      );
    },

    selectAll(keys, selectedScope = scope) {
      selectAllKeys(options.state, mode, keys, {
        scope: selectedScope,
        supportsAllPages: Boolean(options.supportsSelectAllPages),
      });
    },

    clear: () => options.state.clearSelection(),

    reconcile(rows, resolver) {
      const index = buildKeyIndex(rows, resolver);
      const current = options.state.getState().selection;
      const kept = current.filter((key) => index.has(encodeKey(key)));
      if (kept.length !== current.length) options.state.setSelection(kept);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
    },
  };
}
