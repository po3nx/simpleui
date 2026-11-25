import { createElement, setAttributes, setStyle } from '@simpleui/core';
import type { SortDescriptor } from '@simpleui/core';

import { getVisibleColumns, type ColumnState } from '../model/columns.js';
import { toggleSort } from '../data/sort.js';
import {
  createHeaderRow,
  type HeaderRenderContext,
} from './header-renderer.js';

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
  setRowCount(count: number): void;
  setColumns(columns: readonly ColumnState<T>[]): void;
  setSorting(sortBy: readonly SortDescriptor[]): void;
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

  element.append(headerElement, viewportElement, footerElement, liveElement);

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

export function createGridView<T extends object>(
  options: GridViewOptions<T>,
): GridView<T> {
  const rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;
  let rowCount = options.rowCount;
  let sortBy: readonly SortDescriptor[] = options.sortBy ?? [];
  let filtered = new Set(options.filteredColumns ?? []);

  const dom = createSkeleton({
    rowCount,
    rowHeight,
    rtl: Boolean(options.rtl),
    footer: Boolean(options.footer),
  });

  const context = (): HeaderRenderContext => ({
    sortBy,
    filteredColumns: filtered,
    onSortRequest: (columnId, multi) => {
      const next = toggleSort(options.columns, sortBy, columnId, { multi });
      sortBy = next;
      renderHeader(options.columns);
      options.onSortChange?.(next);
    },
  });

  const renderHeader = (columns: readonly ColumnState<T>[]): void => {
    const visible = getVisibleColumns(columns);
    setAttributes(dom.element, { 'aria-colcount': visible.length });
    dom.headerElement.replaceChildren(createHeaderRow<T>(visible, context()));
  };

  renderHeader(options.columns);
  options.container.append(dom.element);

  const onScroll = (): void => {
    options.onScroll?.(dom.viewportElement.scrollTop);
  };
  dom.viewportElement.addEventListener('scroll', onScroll, { passive: true });

  return {
    ...dom,
    setRowCount(count) {
      rowCount = Math.max(0, Math.floor(count));
      setAttributes(dom.element, { 'aria-rowcount': rowCount });
      setStyle(dom.spacerElement, 'block-size', `${rowCount * rowHeight}px`);
    },
    setColumns: (next) => renderHeader(next),
    setSorting(next) {
      sortBy = next;
      renderHeader(options.columns);
    },
    setFilteredColumns(columnIds) {
      filtered = new Set(columnIds);
      renderHeader(options.columns);
    },
    dispose() {
      dom.viewportElement.removeEventListener('scroll', onScroll);
      dom.element.remove();
    },
  };
}
