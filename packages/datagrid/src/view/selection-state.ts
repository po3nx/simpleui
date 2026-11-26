import type { Key } from '@simpleui/core';

import type { ColumnState } from '../model/columns.js';
import {
  createSelectionColumn,
  type SelectionColumnOptions,
} from './selection-column.js';

export interface SelectionStateOptions<T extends object> {
  readonly selectionMode?: 'none' | 'single' | 'multiple';
  readonly rowKey?: ((row: T) => Key) | undefined;
  readonly selectedKeys?: readonly Key[] | undefined;
  readonly getVisibleKeys?: (() => readonly Key[]) | undefined;
  readonly onSelectionChange?: ((keys: readonly Key[]) => void) | undefined;
  readonly announce?: ((message: string) => void) | undefined;
}

export interface SelectionState<T extends object> {
  readonly column: ColumnState<T>;
  setKeys(keys: readonly Key[]): void;
  isSelected(key: Key): boolean;
  subscribe(listener: () => void): () => void;
}

interface ToggleContext {
  readonly selected: Set<Key>;
  readonly mode: 'single' | 'multiple';
  readonly key: Key;
  readonly shift: boolean;
  readonly visible: readonly Key[];
  readonly lastIndex: number;
}

function applyToggle(context: ToggleContext): number {
  const { selected, mode, key, shift, visible, lastIndex } = context;
  if (mode === 'single') {
    const wasSelected = selected.has(key);
    selected.clear();
    if (!wasSelected) selected.add(key);
    return lastIndex;
  }
  if (shift && lastIndex >= 0) {
    return selectRange(selected, visible, key, lastIndex);
  }
  if (selected.has(key)) selected.delete(key);
  else selected.add(key);
  return visible.indexOf(key);
}

function replaceKeys(
  selected: Set<Key>,
  keys: readonly Key[],
  refresh: () => void,
): void {
  selected.clear();
  keys.forEach((key) => selected.add(key));
  refresh();
}

function selectRange(
  selected: Set<Key>,
  visible: readonly Key[],
  key: Key,
  lastIndex: number,
): number {
  const index = visible.indexOf(key);
  if (index < 0) return lastIndex;
  const from = Math.min(index, lastIndex);
  const to = Math.max(index, lastIndex);
  selected.clear();
  visible.slice(from, to + 1).forEach((entry) => selected.add(entry));
  return index;
}

export function createSelectionState<T extends object>(
  options: SelectionStateOptions<T>,
  refresh: () => void,
): SelectionState<T> | undefined {
  const mode = options.selectionMode ?? 'none';
  if (mode === 'none' || !options.rowKey) return undefined;
  const getKey = options.rowKey;
  const selected = new Set<Key>(options.selectedKeys ?? []);
  const listeners = new Set<() => void>();
  let lastIndex = -1;
  const notify = (): void => {
    options.onSelectionChange?.([...selected]);
    options.announce?.(
      selected.size === 0
        ? 'Seleksi dikosongkan.'
        : `${selected.size} baris dipilih.`,
    );
    refresh();
    listeners.forEach((listener) => listener());
  };

  const onToggle = (key: Key, shift: boolean): void => {
    const visible = options.getVisibleKeys?.() ?? [];
    lastIndex = applyToggle({
      selected,
      mode,
      key,
      shift,
      visible,
      lastIndex,
    });
    notify();
  };

  const onToggleAll = (select: boolean): void => {
    selected.clear();
    if (select)
      (options.getVisibleKeys?.() ?? []).forEach((key) => selected.add(key));
    notify();
  };

  const selectionOptions: SelectionColumnOptions<T> = {
    mode,
    getKey,
    isSelected: (key) => selected.has(key),
    getVisibleKeys: () => options.getVisibleKeys?.() ?? [],
    getSelectedKeys: () => [...selected],
    onToggle,
    onToggleAll,
  };
  return {
    column: createSelectionColumn(selectionOptions),
    isSelected: (key) => selected.has(key),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setKeys(keys) {
      replaceKeys(selected, keys, refresh);
    },
  };
}
