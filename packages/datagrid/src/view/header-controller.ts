import { setAttributes } from '@simpleui/core';
import type { SortDescriptor, TemplateRenderer } from '@simpleui/core';

import { getVisibleColumns, type ColumnState } from '../model/columns.js';
import { toggleSort } from '../data/sort.js';
import { computeColumnLayout } from './column-virtualizer.js';
import {
  createHeaderRow,
  type HeaderRenderContext,
} from './header-renderer.js';
import { TemplateManager } from './template-manager.js';

/**
 * Kontrol header (DG-031/DG-033): state sort/filter, layout kolom virtual,
 * shadow tepi, dan aria-colcount.
 */

function mountHeaderTemplate(
  templates: TemplateManager,
  container: HTMLElement,
  column: HeaderColumnLike,
  index: number,
): void {
  const template = column.headerCellTemplate;
  if (!template) return;
  templates.mount(container, template, {
    column: { field: column.dataField ?? column.id, caption: column.caption },
    index,
    value: column.caption,
  } as never);
}

interface HeaderColumnLike {
  readonly id: string;
  readonly dataField?: string | undefined;
  readonly caption: string;
  readonly headerCellTemplate: TemplateRenderer | undefined;
}

export interface HeaderControllerOptions<T extends object> {
  readonly element: HTMLElement;
  readonly headerElement: HTMLElement;
  readonly viewportElement: HTMLElement;
  readonly columns: readonly ColumnState<T>[];
  readonly sortBy?: readonly SortDescriptor[] | undefined;
  readonly filteredColumns?: readonly string[] | undefined;
  readonly onSortChange?:
    ((sortBy: readonly SortDescriptor[]) => void) | undefined;
  readonly onTemplateError?:
    | ((error: unknown, phase: 'render' | 'update' | 'dispose') => void)
    | undefined;
}

export interface HeaderController<T extends object> {
  render(columns: readonly ColumnState<T>[]): void;
  setSorting(sortBy: readonly SortDescriptor[]): void;
  setFilteredColumns(columnIds: readonly string[]): void;
  dispose(): void;
}

export function createHeaderController<T extends object>(
  options: HeaderControllerOptions<T>,
): HeaderController<T> {
  let sortBy: readonly SortDescriptor[] = options.sortBy ?? [];
  let filtered = new Set(options.filteredColumns ?? []);
  const templates = new TemplateManager(
    options.onTemplateError ? { onError: options.onTemplateError } : {},
  );

  const context = (): HeaderRenderContext => ({
    sortBy,
    filteredColumns: filtered,
    onSortRequest: (columnId, multi) => {
      const next = toggleSort(options.columns, sortBy, columnId, { multi });
      sortBy = next;
      render(options.columns);
      options.onSortChange?.(next);
    },
    mountTemplate: (container, column, index) =>
      mountHeaderTemplate(templates, container, column, index),
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
    templates.clear();
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
    dispose() {
      templates.dispose();
    },
  };
}
