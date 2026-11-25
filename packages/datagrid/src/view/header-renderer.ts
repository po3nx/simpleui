import { createElement, setAttributes, setStyle } from '@simpleui/core';
import type { SortDescriptor, TemplateRenderer } from '@simpleui/core';

import type { ColumnState } from '../model/columns.js';
import { sortDirectionFor, sortIndexFor } from '../data/sort.js';
import type { ColumnLayoutEntry } from './column-virtualizer.js';

/**
 * Header renderer DataGrid (DG-031): aria-sort, indikator arah/urutan
 * multi-sort, penanda filter, dan aktivasi keyboard (button native).
 */

export interface HeaderRenderContext {
  readonly sortBy: readonly SortDescriptor[];
  readonly filteredColumns: ReadonlySet<string>;
  readonly onSortRequest?: (columnId: string, multi: boolean) => void;
  readonly mountTemplate?: (
    container: HTMLElement,
    column: HeaderColumn,
    index: number,
  ) => void;
  readonly attachResize?: (
    handle: HTMLElement,
    column: HeaderColumn,
    width: number,
  ) => void;
}

interface HeaderColumn {
  readonly id: string;
  readonly dataField?: string | undefined;
  readonly caption: string;
  readonly allowSorting: boolean;
  readonly headerCellTemplate: TemplateRenderer | undefined;
  readonly children: readonly unknown[] | undefined;
  readonly alignment: ColumnState['alignment'];
  readonly width: number | 'auto';
  readonly minWidth: number;
  readonly maxWidth: number | undefined;
  readonly allowResizing: boolean;
}

function alignmentStyle(alignment: ColumnState['alignment']): string {
  if (alignment === 'end') return 'flex-end';
  if (alignment === 'center') return 'center';
  return 'flex-start';
}

function ariaSortFor(
  column: HeaderColumn,
  sortBy: readonly SortDescriptor[],
): 'ascending' | 'descending' | 'none' | undefined {
  if (!column.allowSorting || column.children) return undefined;
  const selector = column.dataField ?? column.id;
  const direction = sortDirectionFor(sortBy, selector);
  if (direction === 'asc') return 'ascending';
  if (direction === 'desc') return 'descending';
  return 'none';
}

function appendIndicator(
  button: HTMLElement,
  column: HeaderColumn,
  sortBy: readonly SortDescriptor[],
): void {
  const selector = column.dataField ?? column.id;
  const direction = sortDirectionFor(sortBy, selector);
  if (!direction) return;

  const indicator = createElement('span', {
    className: 'sui-grid__sort-indicator',
    text: direction === 'asc' ? '▲' : '▼',
  });
  setAttributes(indicator, { 'aria-hidden': 'true' });

  const order = sortIndexFor(sortBy, selector);
  if (order > 1) {
    const badge = createElement('span', {
      className: 'sui-grid__sort-order',
      text: String(order),
    });
    setAttributes(badge, { 'aria-hidden': 'true' });
    indicator.append(badge);
  }

  button.append(indicator);
}

function createSortButton(
  column: HeaderColumn,
  context: HeaderRenderContext,
  index: number,
): HTMLElement {
  const button = createElement('button', {
    className: 'sui-grid__header-button',
  });
  setAttributes(button, { type: 'button' });
  if (column.headerCellTemplate && context.mountTemplate) {
    context.mountTemplate(button, column, index);
  } else {
    button.textContent = column.caption;
  }
  appendIndicator(button, column, context.sortBy);

  button.addEventListener('click', (event) => {
    if (!context.onSortRequest) return;
    context.onSortRequest(column.id, (event as MouseEvent).shiftKey);
  });

  return button;
}

function createResizeHandle(
  column: HeaderColumn,
  context: HeaderRenderContext,
  width: number,
): HTMLElement | null {
  if (!column.allowResizing || !context.attachResize) return null;
  const handle = createElement('div', { className: 'sui-grid__resize-handle' });
  setAttributes(handle, {
    role: 'separator',
    'aria-orientation': 'vertical',
    tabindex: '0',
    'aria-label': `Ubah lebar ${column.caption}`,
    'aria-valuenow': width,
    'aria-valuemin': column.minWidth,
    'aria-valuemax': column.maxWidth ?? 1000,
  });
  context.attachResize(handle, column, width);
  return handle;
}

function appendFilterMarker(cell: HTMLElement, columnId: string): void {
  const marker = createElement('span', {
    className: 'sui-grid__filter-indicator',
    text: '●',
  });
  setAttributes(marker, {
    'aria-label': 'Filter aktif',
    role: 'img',
    'data-column-id': columnId,
  });
  cell.append(marker);
}

export function createHeaderRow<T extends object>(
  entries: readonly ColumnLayoutEntry<T>[],
  context: HeaderRenderContext,
): HTMLElement {
  const row = createElement('div', {
    className: 'sui-grid__row sui-grid__row--header',
  });
  setAttributes(row, { role: 'row' });

  entries.forEach((entry, index) => {
    const column = entry.column;
    const cell = createElement('div', { className: 'sui-grid__header-cell' });
    setAttributes(cell, { role: 'columnheader', 'aria-colindex': index + 1 });
    setAttributes(cell, { 'data-column-id': column.id });
    setStyle(cell, 'flex-basis', `${entry.width}px`);
    setStyle(cell, 'justify-content', alignmentStyle(column.alignment));

    if (entry.fixed && entry.stickyOffset !== undefined) {
      cell.classList.add(`sui-grid__header-cell--sticky-${entry.fixed}`);
      setStyle(cell, 'position', 'sticky');
      setStyle(
        cell,
        entry.fixed === 'start' ? 'inset-inline-start' : 'inset-inline-end',
        `${entry.stickyOffset}px`,
      );
      setStyle(cell, 'z-index', '1');
    }
    if (entry.shadow) {
      cell.classList.add(`sui-grid__cell--shadow-${entry.shadow}`);
    }

    const ariaSort = ariaSortFor(column, context.sortBy);
    if (ariaSort) setAttributes(cell, { 'aria-sort': ariaSort });

    if (column.allowSorting && !column.children) {
      cell.append(createSortButton(column, context, index));
    } else {
      const label = createElement('span', { text: column.caption });
      cell.append(label);
    }

    if (context.filteredColumns.has(column.id))
      appendFilterMarker(cell, column.id);

    const resizeHandle = createResizeHandle(column, context, entry.width);
    if (resizeHandle) cell.append(resizeHandle);

    row.append(cell);
  });

  return row;
}
