import { setAttributes } from '@simpleui/core';
import type { SortDescriptor } from '@simpleui/core';

import { getVisibleColumns, type ColumnState } from '../model/columns.js';
import { toggleSort } from '../data/sort.js';
import { computeColumnLayout } from './column-virtualizer.js';
import {
  createHeaderRow,
  type HeaderRenderContext,
} from './header-renderer.js';

/**
 * Kontrol header (DG-031/DG-033): state sort/filter, layout kolom virtual,
 * shadow tepi, dan aria-colcount.
 */

export interface HeaderControllerOptions<T extends object> {
  readonly element: HTMLElement;
  readonly headerElement: HTMLElement;
  readonly viewportElement: HTMLElement;
  readonly columns: readonly ColumnState<T>[];
  readonly sortBy?: readonly SortDescriptor[] | undefined;
  readonly filteredColumns?: readonly string[] | undefined;
  readonly onSortChange?:
    ((sortBy: readonly SortDescriptor[]) => void) | undefined;
}

export interface HeaderController<T extends object> {
  render(columns: readonly ColumnState<T>[]): void;
  setSorting(sortBy: readonly SortDescriptor[]): void;
  setFilteredColumns(columnIds: readonly string[]): void;
}

export function createHeaderController<T extends object>(
  options: HeaderControllerOptions<T>,
): HeaderController<T> {
  let sortBy: readonly SortDescriptor[] = options.sortBy ?? [];
  let filtered = new Set(options.filteredColumns ?? []);

  const context = (): HeaderRenderContext => ({
    sortBy,
    filteredColumns: filtered,
    onSortRequest: (columnId, multi) => {
      const next = toggleSort(options.columns, sortBy, columnId, { multi });
      sortBy = next;
      render(options.columns);
      options.onSortChange?.(next);
    },
  });

  const render = (columns: readonly ColumnState<T>[]): void => {
    const visible = getVisibleColumns(columns);
    const layout = computeColumnLayout(
      visible,
      options.viewportElement.clientWidth,
      options.viewportElement.scrollLeft,
    );
    setAttributes(options.element, { 'aria-colcount': visible.length });
    options.element.classList.toggle(
      'sui-grid--shadow-start',
      layout.shadowStart,
    );
    options.element.classList.toggle('sui-grid--shadow-end', layout.shadowEnd);
    const row = createHeaderRow<T>(layout.columns, context());
    row.style.minInlineSize = `${layout.totalWidth}px`;
    options.headerElement.replaceChildren(row);
  };

  return {
    render,
    setSorting(next) {
      sortBy = next;
      render(options.columns);
    },
    setFilteredColumns(columnIds) {
      filtered = new Set(columnIds);
      render(options.columns);
    },
  };
}
