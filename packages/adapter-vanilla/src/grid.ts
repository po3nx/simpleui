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
 * Adapter vanilla DataGrid (DG-053): API framework-agnostic + plugin jQuery
 * opsional.
 */

type RowRecord = Record<string, unknown>;

export interface VanillaDataGridOptions {
  readonly columns: readonly ColumnOptions<RowRecord>[];
  readonly rows: readonly RowRecord[];
  readonly keyExpr?: string | ((row: RowRecord) => Key) | undefined;
  readonly rowHeight?: number | undefined;
  readonly pageIndex?: number | undefined;
  readonly pageSize?: number | undefined;
  readonly totalCount?: number | undefined;
  readonly sortBy?: readonly SortDescriptor[] | undefined;
  readonly selectionMode?: 'none' | 'single' | 'multiple' | undefined;
  readonly selectedKeys?: readonly Key[] | undefined;
  readonly onSortChange?:
    ((sortBy: readonly SortDescriptor[]) => void) | undefined;
  readonly onPageChange?:
    ((state: { pageIndex: number; pageSize: number }) => void) | undefined;
  readonly onSelectionChange?: ((keys: readonly Key[]) => void) | undefined;
}

export interface VanillaDataGrid {
  readonly element: HTMLElement;
  update(options: VanillaDataGridOptions): void;
  destroy(): void;
}

function keyResolver(
  keyExpr: VanillaDataGridOptions['keyExpr'],
): (row: RowRecord) => Key {
  if (typeof keyExpr === 'function') return keyExpr;
  if (typeof keyExpr === 'string') return (row) => row[keyExpr] as Key;
  return (row) => row['id'] as Key;
}

class VanillaDataGridImpl implements VanillaDataGrid {
  readonly element: HTMLElement;
  #options: VanillaDataGridOptions;
  #columns: readonly ColumnState<RowRecord>[];
  #rows: readonly RowRecord[];
  #keyOf: (row: RowRecord) => Key;
  #state = createGridStateStore();
  #view: GridView<RowRecord>;
  #renderer: RowRenderer<RowRecord>;

  constructor(container: HTMLElement, options: VanillaDataGridOptions) {
    this.#options = options;
    this.#columns = normalizeColumnModel(options.columns);
    this.#rows = options.rows;
    this.#keyOf = keyResolver(options.keyExpr);
    this.#view = this.#createView(container);
    this.element = this.#view.host;
    this.#renderer = createRowRenderer<RowRecord>({
      gridElement: this.#view.element,
      viewportElement: this.#view.viewportElement,
      spacerElement: this.#view.spacerElement,
      rowsElement: this.#view.rowsElement,
      columns: this.#rendererColumns(),
      rows: this.#rows,
      keyOf: this.#keyOf,
      ...(options.rowHeight !== undefined
        ? { rowHeight: options.rowHeight }
        : {}),
      focus: createFocusModel<RowRecord>({
        state: this.#state,
        columns: this.#columns,
        getRowKeys: () => this.#rows.map(this.#keyOf),
      }),
    });
  }

  #createView(container: HTMLElement): GridView<RowRecord> {
    const options = this.#options;
    const keyOf = this.#keyOf;
    return createGridView<RowRecord>({
      container,
      columns: this.#columns,
      rowCount: this.#rows.length,
      ...(options.rowHeight !== undefined
        ? { rowHeight: options.rowHeight }
        : {}),
      ...(options.sortBy !== undefined ? { sortBy: options.sortBy } : {}),
      pageIndex: options.pageIndex ?? 0,
      pageSize: options.pageSize ?? 20,
      totalCount: options.totalCount ?? this.#rows.length,
      pager: true,
      ...(options.selectionMode !== undefined
        ? { selectionMode: options.selectionMode }
        : {}),
      rowKey: keyOf,
      getVisibleKeys: () => this.#rows.map(keyOf),
      ...(options.selectedKeys !== undefined
        ? { selectedKeys: options.selectedKeys }
        : {}),
      onSortChange: (next) => {
        options.onSortChange?.(next);
        if (options.sortBy) this.#view.setSorting(options.sortBy);
      },
      onPageChange: (state) => options.onPageChange?.(state),
      onSelectionChange: (keys) => {
        options.onSelectionChange?.(keys);
        if (options.selectedKeys) {
          this.#view.setSelection(options.selectedKeys);
          this.#renderer.setRows(this.#rows);
        }
      },
    });
  }

  #rendererColumns(): readonly ColumnState<RowRecord>[] {
    const selection = this.#view.selectionColumn;
    return selection
      ? [selection as ColumnState<RowRecord>, ...this.#columns]
      : this.#columns;
  }

  update(options: VanillaDataGridOptions): void {
    if (options.columns !== this.#options.columns) {
      this.#columns = normalizeColumnModel(options.columns);
      this.#view.setColumns(this.#columns);
      this.#renderer.setColumns(this.#rendererColumns());
    }
    if (options.rows !== this.#rows) {
      this.#rows = options.rows;
      this.#renderer.setRows(this.#rows);
      this.#view.setRowCount(this.#rows.length);
    }
    if (options.sortBy) this.#view.setSorting(options.sortBy);
    if (options.selectedKeys) {
      this.#view.setSelection(options.selectedKeys);
      this.#renderer.setRows(this.#rows);
    }
    this.#view.setPaging({
      pageIndex: options.pageIndex ?? 0,
      pageSize: options.pageSize ?? 20,
      totalCount: options.totalCount ?? this.#rows.length,
      itemCount: this.#rows.length,
    });
    this.#options = options;
  }

  destroy(): void {
    this.#renderer.dispose();
    this.#view.dispose();
  }
}

export function createDataGrid(
  container: HTMLElement,
  options: VanillaDataGridOptions,
): VanillaDataGrid {
  return new VanillaDataGridImpl(container, options);
}
