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
  readonly onSearchChange?: ((query: string) => void) | undefined;
  readonly viewOptions?: Readonly<Record<string, unknown>> | undefined;
  readonly rtl?: boolean | undefined;
  readonly locale?: string | undefined;
  readonly status?:
    'loading' | 'empty' | 'no-data' | 'error' | null | undefined;
  readonly statusMessage?: string | undefined;
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

function syncLocale(
  next: string | undefined,
  previous: string | undefined,
  renderer: { setLocale(locale: string | undefined): void } | undefined,
): void {
  if (next !== previous) renderer?.setLocale(next);
}

function syncStatus(
  next: string | null | undefined,
  previous: string | null | undefined,
  apply: () => void,
): void {
  if (next !== previous) apply();
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
      ...(options.locale !== undefined ? { locale: options.locale } : {}),
      isSelected: (row) => this.#view.isSelectedKey(this.#keyOf(row)),
      selectionChanges: (listener) => this.#view.subscribeSelection(listener),
      liveElement: this.#view.liveElement,
      rtl: this.#options.rtl === true,
      focus: createFocusModel<RowRecord>({
        state: this.#state,
        columns: this.#columns,
        getRowKeys: () => this.#rows.map(this.#keyOf),
      }),
    });
    this.#applyStatus();
  }

  #applyStatus(): void {
    this.#view.setStatus(this.#options.status ?? null, {
      ...(this.#options.statusMessage !== undefined
        ? { message: this.#options.statusMessage }
        : {}),
      retryable: false,
    });
  }

  #createView(container: HTMLElement): GridView<RowRecord> {
    const options = this.#options;
    const keyOf = this.#keyOf;
    return createGridView<RowRecord>({
      container,
      columns: this.#columns,
      rowCount: this.#rows.length,
      rtl: options.rtl === true,
      ...(options.viewOptions ?? {}),
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
      ...(options.onSearchChange !== undefined
        ? { onSearchChange: (query: string) => options.onSearchChange?.(query) }
        : {}),
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
    const previous = this.#options;
    this.#options = options;
    syncLocale(options.locale, previous.locale, this.#renderer);
    syncStatus(options.status, previous.status, () => this.#applyStatus());
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
