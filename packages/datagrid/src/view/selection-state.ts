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
}

export interface SelectionState<T extends object> {
  readonly column: ColumnState<T>;
  setKeys(keys: readonly Key[]): void;
}

export function createSelectionState<T extends object>(
  options: SelectionStateOptions<T>,
  refresh: () => void,
): SelectionState<T> | undefined {
  const mode = options.selectionMode ?? 'none';
  if (mode === 'none' || !options.rowKey) return undefined;
  const getKey = options.rowKey;
  const selected = new Set<Key>(options.selectedKeys ?? []);
  let lastIndex = -1;

  const notify = (): void => {
    options.onSelectionChange?.([...selected]);
    refresh();
  };

  const onToggle = (key: Key, shift: boolean): void => {
    const visible = options.getVisibleKeys?.() ?? [];
    if (mode === 'single') {
      const wasSelected = selected.has(key);
      selected.clear();
      if (!wasSelected) selected.add(key);
    } else if (shift && lastIndex >= 0) {
      const index = visible.indexOf(key);
      if (index >= 0) {
        const from = Math.min(index, lastIndex);
        const to = Math.max(index, lastIndex);
        selected.clear();
        visible.slice(from, to + 1).forEach((entry) => selected.add(entry));
      }
      lastIndex = index;
    } else {
      if (selected.has(key)) selected.delete(key);
      else selected.add(key);
      lastIndex = visible.indexOf(key);
    }
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
    setKeys(keys) {
      selected.clear();
      keys.forEach((key) => selected.add(key));
      refresh();
    },
  };
}
