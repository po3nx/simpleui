import { createElement, setAttributes, setStyle } from '@simpleui/core';
import type { Key, SortDescriptor } from '@simpleui/core';

import type { ColumnState } from '../model/columns.js';
import {
  createHeaderController,
  type HeaderController,
} from './header-controller.js';
import type { FilterExpression } from '@simpleui/core';
import { createFilterRow, type FilterRow } from './filter-row.js';
import { createSearchPanel, type SearchPanel } from './search-panel.js';
import { createPager, type Pager, type PagingState } from './pager.js';
import { createColumnChooser, type ColumnChooser } from './column-chooser.js';
import {
  createSelectionColumn,
  type SelectionColumnOptions,
} from './selection-column.js';
import {
  createStatusView,
  type GridStatusKind,
  type GridStatusOptions,
  type StatusView,
} from './status-view.js';

/**
 * Kerangka DOM DataGrid (DG-030) + header interaktif (DG-031).
 */

export interface GridViewOptions<T extends object> {
  readonly container: HTMLElement;
  readonly columns: readonly ColumnState<T>[];
  readonly rowCount: number;
  readonly rowHeight?: number;
  readonly rtl?: boolean;
  readonly footer?: boolean;
  readonly sortBy?: readonly SortDescriptor[];
  readonly filteredColumns?: readonly string[];
  readonly onSortChange?: (sortBy: readonly SortDescriptor[]) => void;
  readonly onTemplateError?: (
    error: unknown,
    phase: 'render' | 'update' | 'dispose',
  ) => void;
  readonly messages?: Readonly<Record<string, string>> | undefined;
  readonly onRetry?: (() => void) | undefined;
  readonly onColumnResize?:
    ((columnId: string, width: number) => void) | undefined;
  readonly onColumnReorder?: ((order: readonly string[]) => void) | undefined;
  readonly filterRow?: boolean;
  readonly headerFilter?: boolean;
  readonly getUniqueValues?: (columnId: string) => readonly unknown[];
  readonly searchPanel?: boolean;
  readonly searchDebounceMs?: number;
  readonly searchFields?: readonly string[];
  readonly onSearchChange?:
    ((query: string, fields: readonly string[]) => void) | undefined;
  readonly selectionMode?: 'none' | 'single' | 'multiple';
  readonly rowKey?: ((row: T) => Key) | undefined;
  readonly selectedKeys?: readonly Key[] | undefined;
  readonly getVisibleKeys?: (() => readonly Key[]) | undefined;
  readonly onSelectionChange?: ((keys: readonly Key[]) => void) | undefined;
  readonly columnChooser?: boolean;
  readonly hiddenColumns?: readonly string[] | undefined;
  readonly onVisibilityChange?:
    ((hidden: readonly string[]) => void) | undefined;
  readonly pager?: boolean;
  readonly pageIndex?: number;
  readonly pageSize?: number;
  readonly pageSizes?: readonly number[];
  readonly totalCount?: number | null | undefined;
  readonly itemCount?: number | undefined;
  readonly onPageChange?:
    ((state: { pageIndex: number; pageSize: number }) => void) | undefined;
  readonly filterValue?: FilterExpression | null | undefined;
  readonly onFilterChange?:
    ((filter: FilterExpression | null) => void) | undefined;
  readonly onScroll?: (scrollTop: number) => void;
}

export interface GridView<T extends object> {
  readonly element: HTMLElement;
  readonly headerElement: HTMLElement;
  readonly viewportElement: HTMLElement;
  readonly spacerElement: HTMLElement;
  readonly rowsElement: HTMLElement;
  readonly footerElement: HTMLElement;
  readonly liveElement: HTMLElement;
  readonly status: StatusView;
  readonly filterRow: FilterRow | undefined;
  readonly searchPanel: SearchPanel | undefined;
  readonly pager: Pager | undefined;
  readonly selectionColumn: ColumnState<T> | undefined;
  readonly columnChooser: ColumnChooser | undefined;
  setStatus(kind: GridStatusKind | null, options?: GridStatusOptions): void;
  setHiddenColumns(columnIds: readonly string[]): void;
  setSelection(keys: readonly Key[]): void;
  setPaging(state: PagingState): void;
  setFilterValue(filter: FilterExpression | null): void;
  setRowCount(count: number): void;
  setColumns(columns: readonly ColumnState<T>[]): void;
  setSorting(sortBy: readonly SortDescriptor[]): void;
  clearSorting(): void;
  setFilteredColumns(columnIds: readonly string[]): void;
  dispose(): void;
}

const DEFAULT_ROW_HEIGHT = 40;

interface Skeleton {
  readonly element: HTMLElement;
  readonly headerElement: HTMLElement;
  readonly viewportElement: HTMLElement;
  readonly spacerElement: HTMLElement;
  readonly rowsElement: HTMLElement;
  readonly footerElement: HTMLElement;
  readonly liveElement: HTMLElement;
}

interface SkeletonConfig {
  readonly rowCount: number;
  readonly rowHeight: number;
  readonly rtl: boolean;
  readonly footer: boolean;
}

function createSkeleton(config: SkeletonConfig): Skeleton {
  const element = createElement('div', { className: 'sui-grid' });
  setAttributes(element, { role: 'grid', 'aria-rowcount': config.rowCount });
  if (config.rtl) setAttributes(element, { dir: 'rtl' });

  const headerElement = createElement('div', { className: 'sui-grid__header' });
  setAttributes(headerElement, { role: 'rowgroup' });

  const viewportElement = createElement('div', {
    className: 'sui-grid__viewport',
  });
  const spacerElement = createElement('div', { className: 'sui-grid__spacer' });
  const rowsElement = createElement('div', { className: 'sui-grid__rows' });
  setStyle(
    spacerElement,
    'block-size',
    `${config.rowCount * config.rowHeight}px`,
  );
  spacerElement.append(rowsElement);
  viewportElement.append(spacerElement);

  const footerElement = createElement('div', { className: 'sui-grid__footer' });
  setAttributes(footerElement, { role: 'rowgroup' });
  if (!config.footer) footerElement.hidden = true;

  const liveElement = createElement('div', { className: 'sui-grid__live' });
  setAttributes(liveElement, { 'aria-live': 'polite', 'aria-atomic': 'true' });

  viewportElement.append(headerElement, spacerElement, footerElement);
  element.append(viewportElement, liveElement);

  return {
    element,
    headerElement,
    viewportElement,
    spacerElement,
    rowsElement,
    footerElement,
    liveElement,
  };
}

function searchableFields<T extends object>(
  columns: readonly ColumnState<T>[],
): string[] {
  return columns
    .filter((column) => column.visible && column.allowFiltering)
    .map((column) => column.dataField ?? column.id);
}

function createSearch<T extends object>(
  options: GridViewOptions<T>,
): SearchPanel | undefined {
  if (!options.searchPanel) return undefined;
  return createSearchPanel({
    debounceMs: options.searchDebounceMs,
    fields: options.searchFields ?? searchableFields(options.columns),
    placeholder: options.messages?.['searchPlaceholder'],
    onSearchChange: options.onSearchChange,
  });
}

function createFilter<T extends object>(
  options: GridViewOptions<T>,
): FilterRow | undefined {
  if (!options.filterRow) return undefined;
  const row = createFilterRow({
    columns: options.columns as never,
    filterValue: options.filterValue,
    onFilterChange: options.onFilterChange,
  });
  if (options.filterValue) row.setFilterValue(options.filterValue);
  return row;
}

interface SelectionState<T extends object> {
  readonly column: ColumnState<T>;
  setKeys(keys: readonly Key[]): void;
}

function createSelectionState<T extends object>(
  options: GridViewOptions<T>,
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

function attachPager<T extends object>(
  options: GridViewOptions<T>,
  dom: Skeleton,
): Pager | undefined {
  if (!options.pager) return undefined;
  const pager = createPager({
    pageIndex: options.pageIndex ?? 0,
    pageSize: options.pageSize ?? 20,
    ...(options.totalCount !== undefined
      ? { totalCount: options.totalCount }
      : {}),
    ...(options.itemCount !== undefined
      ? { itemCount: options.itemCount }
      : {}),
    pageSizes: options.pageSizes,
    onPageChange: options.onPageChange,
  });
  dom.footerElement.hidden = false;
  dom.footerElement.append(pager.element);
  return pager;
}

interface Interactive<T extends object> {
  readonly searchPanel: SearchPanel | undefined;
  readonly filterRow: FilterRow | undefined;
  readonly pager: Pager | undefined;
  readonly header: HeaderController<T>;
  readonly selection: SelectionState<T> | undefined;
  readonly withSelection: (
    columns: readonly ColumnState<T>[],
  ) => readonly ColumnState<T>[];
  readonly columnChooser: ColumnChooser | undefined;
  readonly setHidden: (columnIds: readonly string[]) => void;
  readonly filterVisible: (
    columns: readonly ColumnState<T>[],
  ) => readonly ColumnState<T>[];
}

interface Disposables {
  readonly header: { dispose(): void };
  readonly filterRow: FilterRow | undefined;
  readonly searchPanel: SearchPanel | undefined;
  readonly pager: Pager | undefined;
  readonly columnChooser: ColumnChooser | undefined;
  readonly status: StatusView;
}

function disposeGrid(
  dom: Skeleton,
  parts: Disposables,
  onScroll: () => void,
): void {
  dom.viewportElement.removeEventListener('scroll', onScroll);
  parts.header.dispose();
  parts.filterRow?.dispose();
  parts.searchPanel?.dispose();
  parts.pager?.dispose();
  parts.columnChooser?.dispose();
  parts.status.dispose();
  dom.element.remove();
}

function mountGrid<T extends object>(
  options: GridViewOptions<T>,
  dom: Skeleton,
  header: HeaderController<T>,
  columns: readonly ColumnState<T>[],
): void {
  header.render(columns);
  options.container.append(dom.element);
  // Ukuran viewport baru diketahui setelah elemen masuk DOM.
  header.render(columns);
}

function applyRowCount(dom: Skeleton, rowHeight: number, count: number): void {
  const next = Math.max(0, Math.floor(count));
  setAttributes(dom.element, { 'aria-rowcount': next });
  setStyle(dom.spacerElement, 'block-size', `${next * rowHeight}px`);
}

function applyStatus(
  status: StatusView,
  kind: GridStatusKind | null,
  options?: GridStatusOptions,
): void {
  if (kind === null) status.hide();
  else status.show(kind, options);
}

function createInteractive<T extends object>(
  options: GridViewOptions<T>,
  dom: Skeleton,
): Interactive<T> {
  const searchPanel = createSearch(options);
  const filterRow = createFilter(options);
  const pager = attachPager(options, dom);
  const hidden = new Set(options.hiddenColumns ?? []);
  let refreshSelection = (): void => {};
  const selection = createSelectionState(options, () => refreshSelection());
  const filterVisible = (
    columns: readonly ColumnState<T>[],
  ): readonly ColumnState<T>[] =>
    columns.filter((column) => !hidden.has(column.id));
  const withSelection = (
    columns: readonly ColumnState<T>[],
  ): readonly ColumnState<T>[] => {
    const visible = filterVisible(columns);
    return selection ? [selection.column, ...visible] : visible;
  };
  const header = createHeader(
    options,
    dom,
    filterRow,
    withSelection(options.columns),
  );
  refreshSelection = () => header.render(withSelection(options.columns));

  function setHidden(columnIds: readonly string[]): void {
    hidden.clear();
    columnIds.forEach((id) => hidden.add(id));
    options.onVisibilityChange?.([...hidden]);
    header.render(withSelection(options.columns));
  }

  const columnChooser = options.columnChooser
    ? createColumnChooser({
        getColumns: () => options.columns as readonly ColumnState<unknown>[],
        getHidden: () => hidden,
        onChange: setHidden,
      })
    : undefined;
  if (columnChooser) dom.element.prepend(columnChooser.element);

  return {
    searchPanel,
    filterRow,
    pager,
    header,
    selection,
    withSelection,
    columnChooser,
    setHidden,
    filterVisible,
  };
}

function createHeader<T extends object>(
  options: GridViewOptions<T>,
  dom: Skeleton,
  filterRow: FilterRow | undefined,
  columns: readonly ColumnState<T>[],
): HeaderController<T> {
  return createHeaderController<T>({
    element: dom.element,
    headerElement: dom.headerElement,
    viewportElement: dom.viewportElement,
    columns,
    sortBy: options.sortBy,
    filteredColumns: options.filteredColumns,
    onSortChange: options.onSortChange,
    onTemplateError: options.onTemplateError,
    onColumnResize: options.onColumnResize,
    onColumnReorder: options.onColumnReorder,
    liveElement: dom.liveElement,
    extraHeaderElement: filterRow?.element,
    headerFilter: options.headerFilter,
    getUniqueValues: options.getUniqueValues,
    onFilterChange: (filter) => {
      filterRow?.setFilterValue(filter);
      options.onFilterChange?.(filter);
    },
  });
}

function createScrollHandler<T extends object>(
  dom: Skeleton,
  header: HeaderController<T>,
  options: GridViewOptions<T>,
): () => void {
  let lastScrollLeft = dom.viewportElement.scrollLeft;
  const handler = (): void => {
    if (dom.viewportElement.scrollLeft !== lastScrollLeft) {
      lastScrollLeft = dom.viewportElement.scrollLeft;
      header.render(options.columns);
    }
    options.onScroll?.(dom.viewportElement.scrollTop);
  };
  dom.viewportElement.addEventListener('scroll', handler, { passive: true });
  return handler;
}

function createStatus<T extends object>(
  options: GridViewOptions<T>,
  element: HTMLElement,
): StatusView {
  const status = createStatusView({
    messages: options.messages,
    onRetry: options.onRetry,
  });
  element.append(status.element);
  return status;
}

export function createGridView<T extends object>(
  options: GridViewOptions<T>,
): GridView<T> {
  const rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;
  const dom = createSkeleton({
    rowCount: options.rowCount,
    rowHeight,
    rtl: Boolean(options.rtl),
    footer: Boolean(options.footer),
  });
  const {
    searchPanel,
    filterRow,
    pager,
    header,
    selection,
    withSelection,
    columnChooser,
    setHidden,
    filterVisible,
  } = createInteractive(options, dom);
  mountGrid(options, dom, header, withSelection(options.columns));

  const status = createStatus(options, dom.element);
  const onScroll = createScrollHandler(dom, header, options);
  return {
    ...dom,
    status,
    filterRow,
    searchPanel,
    pager,
    setFilterValue: (filter) => filterRow?.setFilterValue(filter),
    setPaging: (state) => pager?.setState(state),
    setStatus: (kind, statusOptions) =>
      applyStatus(status, kind, statusOptions),
    setRowCount: (count) => applyRowCount(dom, rowHeight, count),
    setColumns: (next) => {
      header.render(withSelection(next));
      const visible = filterVisible(next);
      filterRow?.setColumns(visible as never);
      if (!options.searchFields) {
        searchPanel?.setFields(searchableFields(visible));
      }
    },
    selectionColumn: selection?.column,
    columnChooser,
    setSelection: (keys) => selection?.setKeys(keys),
    setHiddenColumns: (columnIds) => setHidden(columnIds),
    setSorting: (next) => header.setSorting(next),
    clearSorting: () => header.clearSorting(),
    setFilteredColumns: (columnIds) => header.setFilteredColumns(columnIds),
    dispose: () =>
      disposeGrid(
        dom,
        { header, filterRow, searchPanel, pager, columnChooser, status },
        onScroll,
      ),
  };
}
