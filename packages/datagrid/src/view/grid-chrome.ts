import type { ColumnState } from '../model/columns.js';
import { createFilterRow, type FilterRow } from './filter-row.js';
import { createSearchPanel, type SearchPanel } from './search-panel.js';
import { createPager, type Pager } from './pager.js';
import { createSummaryFooter, type SummaryFooter } from './summary-footer.js';
import {
  createHeaderController,
  type HeaderController,
} from './header-controller.js';
import { createStatusView, type StatusView } from './status-view.js';
import type { GridViewOptions, Skeleton } from './grid-view.js';

/**
 * Helper chrome GridView (search, filter, pager, summary, header, status,
 * scroll) — dipisah dari grid-view agar berkas tetap terfokus.
 */

export function searchableFields<T extends object>(
  columns: readonly ColumnState<T>[],
): string[] {
  return columns
    .filter((column) => column.visible && column.allowFiltering)
    .map((column) => column.dataField ?? column.id);
}

export function createSearch<T extends object>(
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

export function createFilter<T extends object>(
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

export function attachPager<T extends object>(
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
  dom.host.append(pager.element);
  return pager;
}

export function attachSummary<T extends object>(
  options: GridViewOptions<T>,
  dom: Skeleton,
): SummaryFooter<T> | undefined {
  if (!options.summaryItems || options.summaryItems.length === 0) {
    return undefined;
  }
  const summary = createSummaryFooter({
    columns: options.columns,
    items: options.summaryItems,
    rows: options.summaryRows ?? [],
    locale: options.summaryLocale,
  });
  dom.footerElement.hidden = false;
  dom.footerElement.prepend(summary.element);
  return summary;
}

export function createHeader<T extends object>(
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

export function createScrollHandler<T extends object>(
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

export function createStatus<T extends object>(
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
