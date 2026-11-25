import { createElement, setAttributes, setStyle } from '@simpleui/core';
import type { SortDescriptor } from '@simpleui/core';

import type { ColumnState } from '../model/columns.js';
import {
  createHeaderController,
  type HeaderController,
} from './header-controller.js';
import type { FilterExpression } from '@simpleui/core';
import { createFilterRow, type FilterRow } from './filter-row.js';
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
  setStatus(kind: GridStatusKind | null, options?: GridStatusOptions): void;
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

function createHeader<T extends object>(
  options: GridViewOptions<T>,
  dom: Skeleton,
  filterRow: FilterRow | undefined,
): HeaderController<T> {
  return createHeaderController<T>({
    element: dom.element,
    headerElement: dom.headerElement,
    viewportElement: dom.viewportElement,
    columns: options.columns,
    sortBy: options.sortBy,
    filteredColumns: options.filteredColumns,
    onSortChange: options.onSortChange,
    onTemplateError: options.onTemplateError,
    onColumnResize: options.onColumnResize,
    onColumnReorder: options.onColumnReorder,
    liveElement: dom.liveElement,
    extraHeaderElement: filterRow?.element,
  });
}

function createScrollHandler<T extends object>(
  dom: Skeleton,
  header: HeaderController<T>,
  options: GridViewOptions<T>,
): () => void {
  let lastScrollLeft = dom.viewportElement.scrollLeft;
  return () => {
    if (dom.viewportElement.scrollLeft !== lastScrollLeft) {
      lastScrollLeft = dom.viewportElement.scrollLeft;
      header.render(options.columns);
    }
    options.onScroll?.(dom.viewportElement.scrollTop);
  };
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
  let rowCount = options.rowCount;

  const dom = createSkeleton({
    rowCount,
    rowHeight,
    rtl: Boolean(options.rtl),
    footer: Boolean(options.footer),
  });

  const filterRow = createFilter(options);
  const header = createHeader(options, dom, filterRow);

  header.render(options.columns);
  options.container.append(dom.element);
  // Ukuran viewport baru diketahui setelah elemen masuk DOM.
  header.render(options.columns);

  const status = createStatus(options, dom.element);

  header.render(options.columns);
  options.container.append(dom.element);
  // Ukuran viewport baru diketahui setelah elemen masuk DOM.
  header.render(options.columns);

  const onScroll = createScrollHandler(dom, header, options);
  dom.viewportElement.addEventListener('scroll', onScroll, { passive: true });

  return {
    ...dom,
    status,
    filterRow,
    setFilterValue(filter) {
      filterRow?.setFilterValue(filter);
    },
    setStatus(kind, statusOptions) {
      if (kind === null) status.hide();
      else status.show(kind, statusOptions);
    },
    setRowCount(count) {
      rowCount = Math.max(0, Math.floor(count));
      setAttributes(dom.element, { 'aria-rowcount': rowCount });
      setStyle(dom.spacerElement, 'block-size', `${rowCount * rowHeight}px`);
    },
    setColumns: (next) => {
      header.render(next);
      filterRow?.setColumns(next as never);
    },
    setSorting: (next) => header.setSorting(next),
    clearSorting: () => header.clearSorting(),
    setFilteredColumns: (columnIds) => header.setFilteredColumns(columnIds),
    dispose() {
      dom.viewportElement.removeEventListener('scroll', onScroll);
      header.dispose();
      filterRow?.dispose();
      status.dispose();
      dom.element.remove();
    },
  };
}
