import { createElement, setAttributes, setStyle } from '@simpleui/core';
import type { Key, SortDescriptor } from '@simpleui/core';
import type { SummaryItem } from '../api/types.js';

import type { ColumnState } from '../model/columns.js';
import type { HeaderController } from './header-controller.js';
import type { FilterExpression } from '@simpleui/core';
import type { FilterRow } from './filter-row.js';
import type { SearchPanel } from './search-panel.js';
import type { Pager, PagingState } from './pager.js';
import type { SummaryFooter } from './summary-footer.js';
import {
  attachPager,
  attachSummary,
  createFilter,
  createHeader,
  createScrollHandler,
  createSearch,
  createStatus,
  searchableFields,
} from './grid-chrome.js';
import { createColumnChooser, type ColumnChooser } from './column-chooser.js';
import {
  createSelectionState,
  type SelectionState,
} from './selection-state.js';
import type {
  GridStatusKind,
  GridStatusOptions,
  StatusView,
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
  readonly summaryItems?: readonly SummaryItem<T>[] | undefined;
  readonly summaryRows?: readonly T[] | undefined;
  readonly summaryLocale?: string | undefined;
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
  readonly summaryFooter: SummaryFooter<T> | undefined;
  setStatus(kind: GridStatusKind | null, options?: GridStatusOptions): void;
  setSummaryRows(rows: readonly T[]): void;
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

export interface Skeleton {
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
  readonly summaryFooter: SummaryFooter<never> | undefined;
  readonly filterVisible: (
    columns: readonly ColumnState<T>[],
  ) => readonly ColumnState<T>[];
}

interface Disposables {
  readonly header: { dispose(): void };
  readonly summaryFooter: SummaryFooter<never> | undefined;
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
  parts.summaryFooter?.dispose();
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
  const summaryFooter = attachSummary(options, dom);
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
    summaryFooter,
  };
}

interface GridApiContext<T extends object> {
  readonly options: GridViewOptions<T>;
  readonly dom: Skeleton;
  readonly rowHeight: number;
  readonly header: HeaderController<T>;
  readonly filterRow: FilterRow | undefined;
  readonly searchPanel: SearchPanel | undefined;
  readonly pager: Pager | undefined;
  readonly status: StatusView;
  readonly summaryFooter: SummaryFooter<T> | undefined;
  readonly selection: SelectionState<T> | undefined;
  readonly withSelection: (
    columns: readonly ColumnState<T>[],
  ) => readonly ColumnState<T>[];
  readonly filterVisible: (
    columns: readonly ColumnState<T>[],
  ) => readonly ColumnState<T>[];
  readonly columnChooser: ColumnChooser | undefined;
  readonly setHidden: (columnIds: readonly string[]) => void;
  readonly onScroll: () => void;
}
function createGridApi<T extends object>(ctx: GridApiContext<T>): GridView<T> {
  return {
    ...ctx.dom,
    status: ctx.status,
    filterRow: ctx.filterRow,
    searchPanel: ctx.searchPanel,
    pager: ctx.pager,
    summaryFooter: ctx.summaryFooter,
    setSummaryRows: (rows) => ctx.summaryFooter?.setRows(rows),
    setFilterValue: (filter) => ctx.filterRow?.setFilterValue(filter),
    setPaging: (state) => ctx.pager?.setState(state),
    setStatus: (kind, statusOptions) =>
      applyStatus(ctx.status, kind, statusOptions),
    setRowCount: (count) => applyRowCount(ctx.dom, ctx.rowHeight, count),
    setColumns: (next) => {
      ctx.header.render(ctx.withSelection(next));
      const visible = ctx.filterVisible(next);
      ctx.filterRow?.setColumns(visible as never);
      if (!ctx.options.searchFields) {
        ctx.searchPanel?.setFields(searchableFields(visible));
      }
    },
    selectionColumn: ctx.selection?.column,
    columnChooser: ctx.columnChooser,
    setSelection: (keys) => ctx.selection?.setKeys(keys),
    setHiddenColumns: (columnIds) => ctx.setHidden(columnIds),
    setSorting: (next) => ctx.header.setSorting(next),
    clearSorting: () => ctx.header.clearSorting(),
    setFilteredColumns: (columnIds) => ctx.header.setFilteredColumns(columnIds),
    dispose: () =>
      disposeGrid(
        ctx.dom,
        {
          header: ctx.header,
          summaryFooter: ctx.summaryFooter,
          filterRow: ctx.filterRow,
          searchPanel: ctx.searchPanel,
          pager: ctx.pager,
          columnChooser: ctx.columnChooser,
          status: ctx.status,
        },
        ctx.onScroll,
      ),
  };
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
    summaryFooter,
  } = createInteractive(options, dom);
  mountGrid(options, dom, header, withSelection(options.columns));

  const status = createStatus(options, dom.element);
  const onScroll = createScrollHandler(dom, header, options);
  return createGridApi({
    options,
    dom,
    rowHeight,
    header,
    filterRow,
    searchPanel,
    pager,
    status,
    summaryFooter: summaryFooter as SummaryFooter<T> | undefined,
    selection,
    withSelection,
    filterVisible,
    columnChooser,
    setHidden,
    onScroll,
  });
}
