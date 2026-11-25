import { createElement, setAttributes, setStyle } from '@simpleui/core';

import { getVisibleColumns, type ColumnState } from '../model/columns.js';

/**
 * Kerangka DOM DataGrid (DG-030): grid role, header sticky, viewport +
 * spacer, footer, dan live region. Renderer baris menyusul DG-032/034.
 */

export interface GridViewOptions<T extends object> {
  readonly container: HTMLElement;
  readonly columns: readonly ColumnState<T>[];
  readonly rowCount: number;
  readonly rowHeight?: number;
  readonly rtl?: boolean;
  readonly footer?: boolean;
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
  dispose(): void;
}

const DEFAULT_ROW_HEIGHT = 40;

function alignmentStyle(alignment: ColumnState['alignment']): string {
  if (alignment === 'end') return 'flex-end';
  if (alignment === 'center') return 'center';
  return 'flex-start';
}

function cellWidth(column: {
  width: number | 'auto';
  minWidth: number;
}): number {
  return column.width === 'auto' ? column.minWidth : column.width;
}

function createHeaderRow<T extends object>(
  columns: readonly ColumnState<T>[],
): HTMLElement {
  const row = createElement('div', {
    className: 'sui-grid__row sui-grid__row--header',
  });
  setAttributes(row, { role: 'row' });

  columns.forEach((column, index) => {
    const cell = createElement('div', { className: 'sui-grid__header-cell' });
    setAttributes(cell, {
      role: 'columnheader',
      'aria-colindex': index + 1,
      'data-column-id': column.id,
    });
    setStyle(cell, 'flex-basis', `${cellWidth(column)}px`);
    setStyle(cell, 'justify-content', alignmentStyle(column.alignment));
    cell.textContent = column.caption;
    row.append(cell);
  });

  return row;
}

export function createGridView<T extends object>(
  options: GridViewOptions<T>,
): GridView<T> {
  const rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;
  let rowCount = options.rowCount;
  let columns = getVisibleColumns(options.columns);

  const element = createElement('div', { className: 'sui-grid' });
  setAttributes(element, { role: 'grid', 'aria-rowcount': rowCount });
  if (options.rtl) setAttributes(element, { dir: 'rtl' });

  const headerElement = createElement('div', { className: 'sui-grid__header' });
  setAttributes(headerElement, { role: 'rowgroup' });

  const viewportElement = createElement('div', {
    className: 'sui-grid__viewport',
  });
  const spacerElement = createElement('div', { className: 'sui-grid__spacer' });
  const rowsElement = createElement('div', { className: 'sui-grid__rows' });
  setStyle(spacerElement, 'block-size', `${rowCount * rowHeight}px`);
  spacerElement.append(rowsElement);
  viewportElement.append(spacerElement);

  const footerElement = createElement('div', { className: 'sui-grid__footer' });
  setAttributes(footerElement, { role: 'rowgroup' });
  if (!options.footer) footerElement.hidden = true;

  const liveElement = createElement('div', { className: 'sui-grid__live' });
  setAttributes(liveElement, {
    'aria-live': 'polite',
    'aria-atomic': 'true',
  });

  const renderHeader = (next: readonly ColumnState<T>[]): void => {
    columns = getVisibleColumns(next);
    setAttributes(element, { 'aria-colcount': columns.length });
    headerElement.replaceChildren(createHeaderRow(columns));
  };

  renderHeader(options.columns);
  element.append(headerElement, viewportElement, footerElement, liveElement);
  options.container.append(element);

  const onScroll = (): void => {
    options.onScroll?.(viewportElement.scrollTop);
  };
  viewportElement.addEventListener('scroll', onScroll, { passive: true });

  return {
    element,
    headerElement,
    viewportElement,
    spacerElement,
    rowsElement,
    footerElement,
    liveElement,

    setRowCount(count) {
      rowCount = Math.max(0, Math.floor(count));
      setAttributes(element, { 'aria-rowcount': rowCount });
      setStyle(spacerElement, 'block-size', `${rowCount * rowHeight}px`);
    },

    setColumns: (next) => renderHeader(next),

    dispose() {
      viewportElement.removeEventListener('scroll', onScroll);
      element.remove();
    },
  };
}
