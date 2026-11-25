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
import { attachColumnResize } from './column-resize.js';
import {
  moveColumn,
  moveColumnTo,
  visibleColumnIds,
} from './column-reorder.js';

/**
 * Kontrol header (DG-031/DG-033): state sort/filter, layout kolom virtual,
 * shadow tepi, dan aria-colcount.
 */

function previewColumnWidth(
  root: HTMLElement,
  columnId: string,
  width: number,
): void {
  const selector = `[data-column-id="${CSS.escape(columnId)}"]`;
  root.querySelectorAll<HTMLElement>(selector).forEach((cell) => {
    cell.style.flexBasis = `${width}px`;
  });
}

function createReorderHandlers<T extends object>(
  options: HeaderControllerOptions<T>,
): NonNullable<HeaderRenderContext['reorder']> {
  let source: string | null = null;
  const order = (): string[] =>
    visibleColumnIds(getVisibleColumns(options.columns));

  const apply = (next: readonly string[], movedId: string): void => {
    const current = order();
    if (next.join('|') === current.join('|')) return;
    const column = options.columns.find((entry) => entry.id === movedId);
    const index = next.indexOf(movedId) + 1;
    options.onColumnReorder?.(next);
    if (options.liveElement) {
      options.liveElement.textContent = `Kolom ${column?.caption ?? movedId} dipindah ke posisi ${index}.`;
    }
  };

  return {
    onDragStart(event, columnId) {
      source = columnId;
      event.dataTransfer?.setData('text/plain', columnId);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    },
    onDragOver(event, columnId) {
      void columnId;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    },
    onDrop(event, columnId) {
      event.preventDefault();
      const moved = source ?? event.dataTransfer?.getData('text/plain') ?? '';
      source = null;
      if (!moved || moved === columnId) return;
      apply(moveColumnTo(order(), moved, columnId, 'before'), moved);
    },
    onKeyMove(columnId, delta) {
      apply(moveColumn(order(), columnId, delta), columnId);
    },
  };
}

function createResizeAttacher<T extends object>(
  options: HeaderControllerOptions<T>,
): (handle: HTMLElement, column: HeaderColumnLike, width: number) => void {
  return (handle, column, width) =>
    attachColumnResize({
      handle,
      initialWidth: width,
      minWidth: column.minWidth,
      maxWidth: column.maxWidth,
      onPreview: (next) => {
        handle.setAttribute('aria-valuenow', String(next));
        previewColumnWidth(options.element, column.id, next);
      },
      onCommit: (next) => options.onColumnResize?.(column.id, next),
    });
}

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
  readonly minWidth: number;
  readonly maxWidth: number | undefined;
  readonly allowResizing: boolean;
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
  readonly onColumnResize?:
    ((columnId: string, width: number) => void) | undefined;
  readonly onColumnReorder?: ((order: readonly string[]) => void) | undefined;
  readonly liveElement?: HTMLElement | undefined;
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
    attachResize: createResizeAttacher(options),
    reorder: createReorderHandlers(options),
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
