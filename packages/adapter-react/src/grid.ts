import { createElement, useEffect, useRef, type ReactElement } from 'react';
import type { Key, SortDescriptor } from '@simpleui/core';
import {
  createFocusModel,
  createGridView,
  createGridStateStore,
  createRowRenderer,
  normalizeColumnModel,
  type ColumnOptions,
  type ColumnState,
  type GridView,
  type RowRenderer,
} from '@simpleui/datagrid';

/**
 * Adapter React DataGrid (DG-050): StrictMode-safe, controlled props untuk
 * sort/page/selection, dan update data tanpa re-mount.
 */

export interface DataGridProps<T extends object> {
  readonly columns: readonly ColumnOptions<T>[];
  readonly rows: readonly T[];
  readonly keyExpr?: keyof T | ((row: T) => Key);
  readonly rowHeight?: number;
  readonly pageIndex?: number;
  readonly pageSize?: number;
  readonly totalCount?: number | null;
  readonly sortBy?: readonly SortDescriptor[];
  readonly selectionMode?: 'none' | 'single' | 'multiple';
  readonly selectedKeys?: readonly Key[];
  readonly onSortChange?: (
    sortBy: readonly { selector: string; desc?: boolean }[],
  ) => void;
  readonly onPageChange?: (state: {
    pageIndex: number;
    pageSize: number;
  }) => void;
  readonly onSelectionChange?: (keys: readonly Key[]) => void;
}

function keyResolver<T extends object>(
  keyExpr: DataGridProps<T>['keyExpr'],
): (row: T) => Key {
  if (typeof keyExpr === 'function') return keyExpr;
  if (typeof keyExpr === 'string') {
    return (row) => (row as Record<string, unknown>)[keyExpr] as Key;
  }
  return (row) => (row as Record<string, unknown>)['id'] as Key;
}

class ReactGridController<T extends object> {
  readonly #host: HTMLElement;
  #props: DataGridProps<T>;
  #columns: readonly ColumnState<T>[];
  #rows: readonly T[];
  #keyOf: (row: T) => Key;
  #state = createGridStateStore();
  #view: GridView<T> | undefined;
  #renderer: RowRenderer<T> | undefined;

  constructor(host: HTMLElement, props: DataGridProps<T>) {
    this.#host = host;
    this.#props = props;
    this.#columns = normalizeColumnModel(props.columns);
    this.#rows = props.rows;
    this.#keyOf = keyResolver(props.keyExpr);
    this.#mount();
  }

  #mount(): void {
    const props = this.#props;
    const keyOf = this.#keyOf;
    this.#view = createGridView<T>({
      container: this.#host,
      columns: this.#columns,
      rowCount: this.#rows.length,
      ...(props.rowHeight !== undefined ? { rowHeight: props.rowHeight } : {}),
      ...(props.sortBy !== undefined ? { sortBy: props.sortBy } : {}),
      pageIndex: props.pageIndex ?? 0,
      pageSize: props.pageSize ?? 20,
      totalCount: props.totalCount ?? this.#rows.length,
      pager: true,
      ...(props.selectionMode !== undefined
        ? { selectionMode: props.selectionMode }
        : {}),
      rowKey: keyOf,
      getVisibleKeys: () => this.#rows.map(keyOf),
      ...(props.selectedKeys !== undefined
        ? { selectedKeys: props.selectedKeys }
        : {}),
      onSortChange: (next) => {
        props.onSortChange?.(next);
        // Controlled read-only: kembali ke props bila parent tidak mengubahnya.
        if (props.sortBy) this.#view?.setSorting(props.sortBy);
      },
      onPageChange: (state) => props.onPageChange?.(state),
      onSelectionChange: (keys) => {
        props.onSelectionChange?.(keys);
        if (props.selectedKeys) {
          this.#view?.setSelection(props.selectedKeys);
          this.#renderer?.setRows(this.#rows);
        }
      },
    });

    const focus = createFocusModel<Record<string, unknown>>({
      state: this.#state,
      columns: this.#columns as never,
      getRowKeys: () => this.#rows.map(keyOf),
    });
    this.#renderer = createRowRenderer<T>({
      gridElement: this.#view.element,
      viewportElement: this.#view.viewportElement,
      spacerElement: this.#view.spacerElement,
      rowsElement: this.#view.rowsElement,
      columns: this.#rendererColumns(),
      rows: this.#rows,
      keyOf,
      ...(props.rowHeight !== undefined ? { rowHeight: props.rowHeight } : {}),
      focus: focus as never,
    });
  }

  #rendererColumns(): readonly ColumnState<T>[] {
    const selection = this.#view?.selectionColumn;
    return selection
      ? [selection as ColumnState<T>, ...this.#columns]
      : this.#columns;
  }

  update(props: DataGridProps<T>): void {
    const view = this.#view;
    if (!view) return;
    const columnsChanged = props.columns !== this.#props.columns;
    const rowsChanged = props.rows !== this.#rows;

    if (columnsChanged) {
      this.#columns = normalizeColumnModel(props.columns);
      view.setColumns(this.#columns);
      this.#renderer?.setColumns(this.#rendererColumns());
    }
    if (rowsChanged) {
      this.#rows = props.rows;
      this.#renderer?.setRows(this.#rows);
      view.setRowCount(this.#rows.length);
    }
    if (props.sortBy) view.setSorting(props.sortBy);
    if (props.selectedKeys) {
      view.setSelection(props.selectedKeys);
      this.#renderer?.setRows(this.#rows);
    }
    view.setPaging({
      pageIndex: props.pageIndex ?? 0,
      pageSize: props.pageSize ?? 20,
      totalCount: props.totalCount ?? this.#rows.length,
      itemCount: this.#rows.length,
    });
    this.#props = props;
  }

  dispose(): void {
    this.#renderer?.dispose();
    this.#view?.dispose();
    this.#renderer = undefined;
    this.#view = undefined;
  }
}

export function DataGrid<T extends object>(
  props: DataGridProps<T>,
): ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<ReactGridController<T> | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const controller = new ReactGridController(host, propsRef.current);
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.update(props);
  });

  return createElement('div', {
    ref: hostRef,
    className: 'simpleui-react-grid',
  });
}
