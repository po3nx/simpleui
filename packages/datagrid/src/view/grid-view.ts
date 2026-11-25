import { createElement, setAttributes, setStyle } from '@simpleui/core';
import type { SortDescriptor } from '@simpleui/core';

import type { ColumnState } from '../model/columns.js';
import { createHeaderController } from './header-controller.js';

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

  const header = createHeaderController<T>({
    element: dom.element,
    headerElement: dom.headerElement,
    viewportElement: dom.viewportElement,
    columns: options.columns,
    sortBy: options.sortBy,
    filteredColumns: options.filteredColumns,
    onSortChange: options.onSortChange,
  });

  header.render(options.columns);
  options.container.append(dom.element);
  // Ukuran viewport baru diketahui setelah elemen masuk DOM.
  header.render(options.columns);

  let lastScrollLeft = dom.viewportElement.scrollLeft;
  const onScroll = (): void => {
    if (dom.viewportElement.scrollLeft !== lastScrollLeft) {
      lastScrollLeft = dom.viewportElement.scrollLeft;
      header.render(options.columns);
    }
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
    setColumns: (next) => header.render(next),
    setSorting: (next) => header.setSorting(next),
    setFilteredColumns: (columnIds) => header.setFilteredColumns(columnIds),
    dispose() {
      dom.viewportElement.removeEventListener('scroll', onScroll);
      dom.element.remove();
    },
  };
}
