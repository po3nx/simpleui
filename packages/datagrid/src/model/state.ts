import {
  createSelector,
  createStore,
  type FilterExpression,
  type Key,
  type SortDescriptor,
} from '@simpleui/core';

import type { DataGridStateSnapshot } from '../api/types.js';
import { DataGridError } from '../errors.js';

/**
 * State store DataGrid (DG-012): state immutable, transaksi batch, transisi
 * status data yang dijaga, snapshot versioned, dan selector memoized.
 */

export type DataStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface FocusedCell {
  readonly rowKey: Key;
  readonly columnId: string;
}

export interface GridState {
  readonly sorting: readonly SortDescriptor[];
  readonly filterValue: FilterExpression | null;
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly selection: readonly Key[];
  readonly columnWidths: Readonly<Record<string, number>>;
  readonly columnOrder: readonly string[];
  readonly hiddenColumns: readonly string[];
  readonly groupBy: readonly string[];
  readonly expandedGroups: readonly string[];
  readonly focusedCell: FocusedCell | null;
  readonly dataStatus: DataStatus;
}

export interface GridStateStore {
  getState(): Readonly<GridState>;
  setSorting(sortBy: readonly SortDescriptor[]): void;
  setFilter(filterValue: FilterExpression | null): void;
  setPage(pageIndex: number): void;
  setPageSize(pageSize: number): void;
  setSelection(keys: readonly Key[]): void;
  toggleSelection(key: Key, mode?: 'single' | 'multiple'): void;
  selectAll(keys: readonly Key[]): void;
  clearSelection(): void;
  setColumnWidth(columnId: string, width: number): void;
  setColumnOrder(order: readonly string[]): void;
  setColumnHidden(columnId: string, hidden: boolean): void;
  setGroupBy(fields: readonly string[]): void;
  toggleGroupExpanded(groupKey: string): void;
  setFocusedCell(cell: FocusedCell | null): void;
  setStatus(status: DataStatus): void;
  transaction(fn: () => void): void;
  subscribe(
    listener: (state: GridState, previous: GridState) => void,
  ): () => void;
  toSnapshot(): DataGridStateSnapshot;
  restore(snapshot: DataGridStateSnapshot): void;
  dispose(): void;
}

const SNAPSHOT_VERSION = 2;

const TRANSITIONS: Record<DataStatus, readonly DataStatus[]> = {
  idle: ['loading'],
  loading: ['loaded', 'error', 'idle'],
  loaded: ['loading', 'idle'],
  error: ['loading', 'idle'],
};

export function createDefaultState(): GridState {
  return {
    sorting: [],
    filterValue: null,
    pageIndex: 0,
    pageSize: 20,
    selection: [],
    columnWidths: {},
    columnOrder: [],
    hiddenColumns: [],
    groupBy: [],
    expandedGroups: [],
    focusedCell: null,
    dataStatus: 'idle',
  };
}

function fail(
  code: 'SUI-DG-001' | 'SUI-DG-008' | 'SUI-DG-009',
  message: string,
): never {
  throw new DataGridError(code, message);
}

function assertPageSize(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 10_000) {
    fail('SUI-DG-001', 'pageSize harus bilangan bulat 1..10000');
  }
  return value;
}

function assertPageIndex(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    fail('SUI-DG-001', 'pageIndex harus bilangan bulat >= 0');
  }
  return value;
}

function dedupeKeys(keys: readonly Key[]): Key[] {
  return [...new Set(keys)];
}

function dedupeStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function assertTransition(from: DataStatus, to: DataStatus): void {
  if (from === to) return;
  if (!TRANSITIONS[from].includes(to)) {
    fail('SUI-DG-009', `transisi status tidak valid: ${from} -> ${to}`);
  }
}

function isSnapshot(value: unknown): value is DataGridStateSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const snapshot = value as Partial<DataGridStateSnapshot>;
  return snapshot.version === SNAPSHOT_VERSION;
}

type GridStore = ReturnType<typeof createStore<GridState>>;
type SelectionSetter = (keys: readonly Key[]) => void;

function pagingApi(
  store: GridStore,
): Pick<
  GridStateStore,
  'setSorting' | 'setFilter' | 'setPage' | 'setPageSize'
> {
  return {
    setSorting: (sortBy) => store.setState({ sorting: sortBy, pageIndex: 0 }),
    setFilter: (filterValue) => store.setState({ filterValue, pageIndex: 0 }),
    setPage: (pageIndex) =>
      store.setState({ pageIndex: assertPageIndex(pageIndex) }),
    setPageSize: (pageSize) =>
      store.setState({ pageSize: assertPageSize(pageSize), pageIndex: 0 }),
  };
}

function selectionApi(
  store: GridStore,
  setSelection: SelectionSetter,
): Pick<GridStateStore, 'toggleSelection' | 'selectAll' | 'clearSelection'> {
  return {
    toggleSelection: (key, mode = 'multiple') => {
      if (mode === 'single') {
        setSelection([key]);
        return;
      }
      store.setState((state) => ({
        selection: state.selection.includes(key)
          ? state.selection.filter((item) => item !== key)
          : [...state.selection, key],
      }));
    },
    selectAll: (keys) =>
      store.setState((state) => ({
        selection: dedupeKeys([...state.selection, ...keys]),
      })),
    clearSelection: () => store.setState({ selection: [] }),
  };
}

function columnApi(
  store: GridStore,
): Pick<
  GridStateStore,
  'setColumnWidth' | 'setColumnOrder' | 'setColumnHidden'
> {
  return {
    setColumnWidth: (columnId, width) => {
      if (!Number.isFinite(width) || width <= 0) {
        fail('SUI-DG-001', 'lebar kolom harus angka > 0');
      }
      store.setState((state) => ({
        columnWidths: { ...state.columnWidths, [columnId]: width },
      }));
    },
    setColumnOrder: (order) =>
      store.setState({ columnOrder: dedupeStrings(order) }),
    setColumnHidden: (columnId, hidden) =>
      store.setState((state) => ({
        hiddenColumns: hidden
          ? dedupeStrings([...state.hiddenColumns, columnId])
          : state.hiddenColumns.filter((id) => id !== columnId),
      })),
  };
}

function groupingApi(
  store: GridStore,
): Pick<GridStateStore, 'setGroupBy' | 'toggleGroupExpanded'> {
  return {
    setGroupBy: (fields) => store.setState({ groupBy: dedupeStrings(fields) }),
    toggleGroupExpanded: (groupKey) =>
      store.setState((state) => ({
        expandedGroups: state.expandedGroups.includes(groupKey)
          ? state.expandedGroups.filter((key) => key !== groupKey)
          : [...state.expandedGroups, groupKey],
      })),
  };
}

function statusApi(
  store: GridStore,
): Pick<GridStateStore, 'setStatus' | 'setFocusedCell'> {
  return {
    setFocusedCell: (cell) => store.setState({ focusedCell: cell }),
    setStatus: (status) => {
      assertTransition(store.getState().dataStatus, status);
      store.setState({ dataStatus: status });
    },
  };
}

function snapshotApi(
  store: GridStore,
): Pick<GridStateStore, 'toSnapshot' | 'restore'> {
  return {
    toSnapshot() {
      const state = store.getState();
      return {
        version: SNAPSHOT_VERSION,
        sortBy: state.sorting,
        filterValue: state.filterValue,
        pageIndex: state.pageIndex,
        pageSize: state.pageSize,
        columnWidths: state.columnWidths,
        columnOrder: state.columnOrder,
        hiddenColumns: state.hiddenColumns,
        groupBy: state.groupBy,
        expandedGroups: state.expandedGroups,
      };
    },
    restore(snapshot) {
      if (!isSnapshot(snapshot)) {
        fail(
          'SUI-DG-008',
          'snapshot state tidak valid atau versi tidak dikenal',
        );
      }
      store.setState({
        sorting: snapshot.sortBy ?? [],
        filterValue: snapshot.filterValue ?? null,
        pageIndex: assertPageIndex(snapshot.pageIndex ?? 0),
        pageSize: assertPageSize(snapshot.pageSize ?? 20),
        columnWidths: snapshot.columnWidths ?? {},
        columnOrder: dedupeStrings(snapshot.columnOrder ?? []),
        hiddenColumns: dedupeStrings(snapshot.hiddenColumns ?? []),
        groupBy: dedupeStrings(snapshot.groupBy ?? []),
        expandedGroups: dedupeStrings(snapshot.expandedGroups ?? []),
        dataStatus: 'idle',
      });
    },
  };
}

export function createGridStateStore(
  initial: Partial<GridState> = {},
): GridStateStore {
  const store = createStore<GridState>({ ...createDefaultState(), ...initial });
  const setSelection: SelectionSetter = (keys) =>
    store.setState({ selection: dedupeKeys(keys) });

  return {
    getState: () => store.getState(),
    ...pagingApi(store),
    setSelection,
    ...selectionApi(store, setSelection),
    ...columnApi(store),
    ...groupingApi(store),
    ...statusApi(store),
    transaction: (fn) => store.transaction(fn),
    subscribe: (listener) => store.subscribe(listener),
    ...snapshotApi(store),
    dispose: () => store.dispose(),
  };
}

export const selectSelectedKeySet = createSelector(
  (state: GridState) => new Set(state.selection),
);

export const selectHiddenColumns = createSelector(
  (state: GridState) => new Set(state.hiddenColumns),
);

export const selectIsFiltered = createSelector(
  (state: GridState) => state.filterValue !== null,
);

export function selectPageCount(state: GridState, totalCount: number): number {
  return state.pageSize > 0 ? Math.ceil(totalCount / state.pageSize) : 0;
}
