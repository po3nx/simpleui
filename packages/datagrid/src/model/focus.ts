import type { Key } from '@simpleui/core';

import { DataGridError } from '../errors.js';
import { getVisibleColumns, type ColumnState } from './columns.js';
import { keyToDomId } from './key.js';
import type { FocusedCell, GridStateStore } from './state.js';

/**
 * Focus model DataGrid (DG-021): sel aktif, navigasi panah dengan clamp,
 * Home/End, roving tabindex, dan pemulihan fokus setelah reload.
 */

export type MoveDirection = 'up' | 'down' | 'left' | 'right';
export type Edge = 'start' | 'end';
export type EdgeScope = 'row' | 'grid';

export interface FocusModelOptions<T extends object> {
  readonly state: GridStateStore;
  readonly columns: readonly ColumnState<T>[];
  readonly getRowKeys: () => readonly Key[];
}

export interface FocusModel {
  get(): FocusedCell | null;
  set(cell: FocusedCell | null): void;
  first(): void;
  move(direction: MoveDirection): void;
  moveTo(edge: Edge, scope?: EdgeScope): void;
  focusRow(rowKey: Key): void;
  restore(): FocusedCell | null;
  cellDomId(rowKey: Key, columnId: string): string;
  tabIndexFor(rowKey: Key, columnId: string): 0 | -1;
}

interface Geometry {
  columnIds(): readonly string[];
  rowKeys(): readonly Key[];
  first(): FocusedCell | null;
  last(): FocusedCell | null;
  clamp(rowIndex: number, columnIndex: number): FocusedCell | null;
}

function indexOfKey(keys: readonly Key[], key: Key): number {
  return keys.findIndex((item) => Object.is(item, key));
}

function createGeometry<T extends object>(
  columns: readonly ColumnState<T>[],
  getRowKeys: () => readonly Key[],
): Geometry {
  const columnIds = (): readonly string[] =>
    getVisibleColumns(columns).map((column) => column.id);
  const rowKeys = (): readonly Key[] => getRowKeys();

  const at = (rowIndex: number, columnIndex: number): FocusedCell | null => {
    const rowKey = rowKeys()[rowIndex];
    const columnId = columnIds()[columnIndex];
    return rowKey === undefined || columnId === undefined
      ? null
      : { rowKey, columnId };
  };

  return {
    columnIds,
    rowKeys,
    first: () => at(0, 0),
    last: () => at(rowKeys().length - 1, columnIds().length - 1),
    clamp: at,
  };
}

function setValidated(
  state: GridStateStore,
  geometry: Geometry,
  cell: FocusedCell | null,
): void {
  if (cell === null) {
    state.setFocusedCell(null);
    return;
  }
  const columnIndex = geometry.columnIds().indexOf(cell.columnId);
  const rowIndex = indexOfKey(geometry.rowKeys(), cell.rowKey);
  if (columnIndex < 0 || rowIndex < 0) {
    throw new DataGridError(
      'SUI-DG-001',
      'Sel fokus tidak berada pada baris/kolom yang terlihat.',
    );
  }
  state.setFocusedCell(cell);
}

function moveCell(
  state: GridStateStore,
  geometry: Geometry,
  direction: MoveDirection,
): void {
  const columns = geometry.columnIds();
  const rows = geometry.rowKeys();
  if (columns.length === 0 || rows.length === 0) {
    state.setFocusedCell(null);
    return;
  }

  const existing = state.getState().focusedCell;
  if (!existing) {
    state.setFocusedCell(geometry.first());
    return;
  }

  let rowIndex = Math.max(0, indexOfKey(rows, existing.rowKey));
  let columnIndex = Math.max(0, columns.indexOf(existing.columnId));
  if (direction === 'left') columnIndex = Math.max(0, columnIndex - 1);
  if (direction === 'right')
    columnIndex = Math.min(columns.length - 1, columnIndex + 1);
  if (direction === 'up') rowIndex = Math.max(0, rowIndex - 1);
  if (direction === 'down') rowIndex = Math.min(rows.length - 1, rowIndex + 1);

  state.setFocusedCell(geometry.clamp(rowIndex, columnIndex));
}

function moveToEdge(
  state: GridStateStore,
  geometry: Geometry,
  edge: Edge,
  scope: EdgeScope,
): void {
  if (scope === 'grid') {
    state.setFocusedCell(edge === 'start' ? geometry.first() : geometry.last());
    return;
  }

  const columns = geometry.columnIds();
  const current = state.getState().focusedCell ?? geometry.first();
  if (!current || columns.length === 0) return;
  const columnId = edge === 'start' ? columns[0] : columns[columns.length - 1];
  if (columnId !== undefined)
    state.setFocusedCell({ rowKey: current.rowKey, columnId });
}

function restoreFocus(
  state: GridStateStore,
  geometry: Geometry,
): FocusedCell | null {
  const current = state.getState().focusedCell;
  if (!current) return null;

  const columns = geometry.columnIds();
  const rows = geometry.rowKeys();
  if (columns.length === 0 || rows.length === 0) {
    state.setFocusedCell(null);
    return null;
  }
  if (indexOfKey(rows, current.rowKey) < 0) {
    state.setFocusedCell(null);
    return null;
  }
  if (!columns.includes(current.columnId)) {
    const next = { rowKey: current.rowKey, columnId: columns[0] as string };
    state.setFocusedCell(next);
    return next;
  }
  return current;
}

function focusRowKey(
  state: GridStateStore,
  geometry: Geometry,
  rowKey: Key,
): void {
  const columns = geometry.columnIds();
  if (columns.length === 0) return;
  const current = state.getState().focusedCell;
  const columnId = current?.columnId ?? (columns[0] as string);
  setValidated(state, geometry, { rowKey, columnId });
}

export function createFocusModel<T extends object>(
  options: FocusModelOptions<T>,
): FocusModel {
  const geometry = createGeometry(options.columns, options.getRowKeys);
  const { state } = options;

  return {
    get: () => state.getState().focusedCell,
    set: (cell) => setValidated(state, geometry, cell),
    first: () => state.setFocusedCell(geometry.first()),
    move: (direction) => moveCell(state, geometry, direction),
    moveTo: (edge, scope = 'grid') => moveToEdge(state, geometry, edge, scope),
    focusRow: (rowKey) => focusRowKey(state, geometry, rowKey),
    restore: () => restoreFocus(state, geometry),

    cellDomId: (rowKey, columnId) =>
      `${keyToDomId(rowKey)}-${encodeURIComponent(columnId)}`,

    tabIndexFor(rowKey, columnId) {
      const current = state.getState().focusedCell ?? geometry.first();
      return current?.rowKey === rowKey && current.columnId === columnId
        ? 0
        : -1;
    },
  };
}
