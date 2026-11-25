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
 * Kontrol header (DG-031/033/037/038/039): layout kolom, sort/multi-sort,
 * reset, pengumuman live region, resize, reorder, dan template.
 */

interface HeaderColumnLike {
  readonly id: string;
  readonly dataField?: string | undefined;
  readonly caption: string;
  readonly headerCellTemplate: TemplateRenderer | undefined;
  readonly minWidth: number;
  readonly maxWidth: number | undefined;
  readonly allowResizing: boolean;
}

interface LabelColumn {
  readonly id: string;
  readonly dataField?: string | undefined;
  readonly caption: string;
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
  readonly onColumnResize?:
    ((columnId: string, width: number) => void) | undefined;
  readonly onColumnReorder?: ((order: readonly string[]) => void) | undefined;
  readonly onTemplateError?:
    | ((error: unknown, phase: 'render' | 'update' | 'dispose') => void)
    | undefined;
  readonly liveElement?: HTMLElement | undefined;
  readonly extraHeaderElement?: HTMLElement | undefined;
}

export interface HeaderController<T extends object> {
  render(columns: readonly ColumnState<T>[]): void;
  setSorting(sortBy: readonly SortDescriptor[]): void;
  clearSorting(): void;
  setFilteredColumns(columnIds: readonly string[]): void;
  dispose(): void;
}

function sortLabel(
  sortBy: readonly SortDescriptor[],
  columns: readonly LabelColumn[],
): string {
  if (sortBy.length === 0) return 'Pengurutan dihapus.';
  const parts = sortBy.map((descriptor) => {
    const column = columns.find(
      (entry) => (entry.dataField ?? entry.id) === descriptor.selector,
    );
    return `${column?.caption ?? descriptor.selector} ${
      descriptor.desc ? 'menurun' : 'menaik'
    }`;
  });
  if (parts.length === 1) return `Diurutkan berdasarkan ${parts[0]}.`;
  return `Diurutkan berdasarkan ${parts.length} kolom: ${parts.join(', ')}.`;
}

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

function createReorderHandlers<T extends object>(
  options: HeaderControllerOptions<T>,
): NonNullable<HeaderRenderContext['reorder']> {
  let source: string | null = null;
  const order = (): string[] =>
    visibleColumnIds(getVisibleColumns(options.columns));

  const apply = (next: readonly string[], movedId: string): void => {
    if (next.join('|') === order().join('|')) return;
    const column = options.columns.find((entry) => entry.id === movedId);
    options.onColumnReorder?.(next);
    if (options.liveElement) {
      options.liveElement.textContent = `Kolom ${column?.caption ?? movedId} dipindah ke posisi ${next.indexOf(movedId) + 1}.`;
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
      if (moved && moved !== columnId) {
        apply(moveColumnTo(order(), moved, columnId, 'before'), moved);
      }
    },
    onKeyMove(columnId, delta) {
      apply(moveColumn(order(), columnId, delta), columnId);
    },
  };
}

class HeaderControllerImpl<T extends object> implements HeaderController<T> {
  readonly #options: HeaderControllerOptions<T>;
  readonly #templates: TemplateManager;
  readonly #resize: (
    handle: HTMLElement,
    column: HeaderColumnLike,
    width: number,
  ) => void;
  readonly #reorder: NonNullable<HeaderRenderContext['reorder']>;
  #sortBy: readonly SortDescriptor[];
  #filtered: Set<string>;

  constructor(options: HeaderControllerOptions<T>) {
    this.#options = options;
    this.#sortBy = options.sortBy ?? [];
    this.#filtered = new Set(options.filteredColumns ?? []);
    this.#templates = new TemplateManager(
      options.onTemplateError ? { onError: options.onTemplateError } : {},
    );
    this.#resize = createResizeAttacher(options);
    this.#reorder = createReorderHandlers(options);
  }

  #announce(text: string): void {
    if (this.#options.liveElement) {
      this.#options.liveElement.textContent = text;
    }
  }

  #context(): HeaderRenderContext {
    return {
      sortBy: this.#sortBy,
      filteredColumns: this.#filtered,
      onSortRequest: (columnId, multi, clear) =>
        this.#applySort(columnId, multi, clear),
      mountTemplate: (container, column, index) =>
        mountHeaderTemplate(this.#templates, container, column, index),
      attachResize: this.#resize,
      reorder: this.#reorder,
    };
  }

  #applySort(columnId: string, multi: boolean, clear: boolean): void {
    const next = clear
      ? []
      : toggleSort(this.#options.columns, this.#sortBy, columnId, { multi });
    this.#sortBy = next;
    this.render(this.#options.columns);
    this.#options.onSortChange?.(next);
    this.#announce(sortLabel(next, this.#options.columns));
  }

  render(columns: readonly ColumnState<T>[]): void {
    const visible = getVisibleColumns(columns);
    const selectors = new Set(
      visible.map((column) => column.dataField ?? column.id),
    );
    this.#sortBy = this.#sortBy.filter((descriptor) =>
      selectors.has(descriptor.selector),
    );

    const layout = computeColumnLayout(
      visible,
      this.#options.viewportElement.clientWidth,
      this.#options.viewportElement.scrollLeft,
    );
    setAttributes(this.#options.element, { 'aria-colcount': visible.length });
    this.#options.element.classList.toggle(
      'sui-grid--shadow-start',
      layout.shadowStart,
    );
    this.#options.element.classList.toggle(
      'sui-grid--shadow-end',
      layout.shadowEnd,
    );

    this.#templates.clear();
    const row = createHeaderRow<T>(layout.columns, this.#context());
    row.style.minInlineSize = `${layout.totalWidth}px`;
    const extra = this.#options.extraHeaderElement;
    if (extra) extra.style.minInlineSize = `${layout.totalWidth}px`;
    this.#options.headerElement.replaceChildren(row, ...(extra ? [extra] : []));
  }

  setSorting(next: readonly SortDescriptor[]): void {
    this.#sortBy = next;
    this.render(this.#options.columns);
  }

  clearSorting(): void {
    this.#sortBy = [];
    this.render(this.#options.columns);
    this.#options.onSortChange?.([]);
    this.#announce(sortLabel([], this.#options.columns));
  }

  setFilteredColumns(columnIds: readonly string[]): void {
    this.#filtered = new Set(columnIds);
    this.render(this.#options.columns);
  }

  dispose(): void {
    this.#templates.dispose();
  }
}

export function createHeaderController<T extends object>(
  options: HeaderControllerOptions<T>,
): HeaderController<T> {
  return new HeaderControllerImpl(options);
}
