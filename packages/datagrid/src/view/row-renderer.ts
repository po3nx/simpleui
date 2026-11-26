import { Virtualizer, type Key } from '@simpleui/core';

import { getVisibleColumns, type ColumnState } from '../model/columns.js';
import { cellValueFor, formatRowCell } from './cell-renderer.js';
import type { FocusModel } from '../model/focus.js';
import { keyToDomId } from '../model/key.js';
import { attachGridKeyboard } from './keyboard.js';
import { TemplateManager } from './template-manager.js';
import {
  computeColumnLayout,
  type ColumnLayoutEntry,
} from './column-virtualizer.js';

/**
 * Row renderer DataGrid (DG-032): virtualisasi baris, daur ulang node, dan
 * scroll anchoring saat data berubah.
 */

export interface RowRendererOptions<T extends object> {
  readonly gridElement: HTMLElement;
  readonly viewportElement: HTMLElement;
  readonly spacerElement: HTMLElement;
  readonly rowsElement: HTMLElement;
  readonly columns: readonly ColumnState<T>[];
  readonly rows: readonly T[];
  readonly keyOf: (row: T) => Key;
  readonly rowHeight?: number;
  readonly overscan?: number;
  readonly locale?: string;
  readonly emptyText?: string;
  readonly onTemplateError?: (
    error: unknown,
    phase: 'render' | 'update' | 'dispose',
  ) => void;
  readonly focus?: FocusModel | undefined;
  readonly liveElement?: HTMLElement | undefined;
  readonly isSelected?: ((row: T) => boolean) | undefined;
  readonly selectionChanges?:
    ((listener: () => void) => () => void) | undefined;
}

export interface RowRenderer<T extends object> {
  setRows(rows: readonly T[]): void;
  setColumns(columns: readonly ColumnState<T>[]): void;
  getRenderedCount(): number;
  setLocale(locale: string | undefined): void;
  dispose(): void;
}

const DEFAULT_ROW_HEIGHT = 40;
const FALLBACK_VIEWPORT = 320;

interface Anchor {
  readonly key: Key;
  readonly offset: number;
}

function justifyFor(alignment: ColumnState['alignment']): string {
  if (alignment === 'end') return 'flex-end';
  if (alignment === 'center') return 'center';
  return 'flex-start';
}

function createCell<T extends object>(
  entry: ColumnLayoutEntry<T>,
  columnIndex: number,
): HTMLElement {
  const cell = document.createElement('div');
  cell.className = 'sui-grid__cell';
  cell.setAttribute('role', 'gridcell');
  cell.setAttribute('aria-colindex', String(columnIndex));
  cell.setAttribute('data-column-id', entry.column.id);
  cell.style.flexBasis = `${entry.width}px`;
  cell.style.justifyContent = justifyFor(entry.column.alignment);

  if (entry.fixed && entry.stickyOffset !== undefined) {
    cell.classList.add(`sui-grid__cell--sticky-${entry.fixed}`);
    cell.style.position = 'sticky';
    cell.style[
      entry.fixed === 'start' ? 'insetInlineStart' : 'insetInlineEnd'
    ] = `${entry.stickyOffset}px`;
    cell.style.zIndex = '1';
  }
  if (entry.shadow) {
    cell.classList.add(`sui-grid__cell--shadow-${entry.shadow}`);
  }

  return cell;
}

class VirtualRowRenderer<T extends object> implements RowRenderer<T> {
  readonly #options: RowRendererOptions<T>;
  readonly #rowHeight: number;
  readonly #overscan: number;
  readonly #virtualizer: Virtualizer;
  readonly #pool: HTMLElement[] = [];
  #rows: readonly T[];
  #columns: readonly ColumnState<T>[];
  #locale: string | undefined;
  #layoutSignature = '';
  #disposed = false;
  readonly #templates: TemplateManager;
  readonly #detachKeyboard: (() => void) | undefined;
  readonly #unsubscribeSelection: (() => void) | undefined;

  constructor(options: RowRendererOptions<T>) {
    this.#options = options;
    this.#rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;
    this.#overscan = options.overscan ?? 5;
    this.#rows = options.rows;
    this.#columns = getVisibleColumns(options.columns);
    this.#locale = options.locale;
    this.#templates = new TemplateManager(
      options.onTemplateError ? { onError: options.onTemplateError } : {},
    );
    this.#detachKeyboard = this.#attachKeyboard();
    this.#unsubscribeSelection = options.selectionChanges?.(() =>
      this.#render(),
    );
    this.#virtualizer = this.#createVirtualizer();
    options.viewportElement.addEventListener('scroll', this.#onScroll, {
      passive: true,
    });
    this.#updateSpacer();
    this.#render();
  }

  readonly #onScroll = (): void => this.#render();

  #createVirtualizer(): Virtualizer {
    return new Virtualizer({
      itemCount: this.#rows.length,
      itemSize: this.#rowHeight,
      viewportSize: FALLBACK_VIEWPORT,
      overscan: this.#overscan,
    });
  }

  #attachKeyboard(): (() => void) | undefined {
    const focus = this.#options.focus;
    if (!focus) return undefined;
    return attachGridKeyboard({
      element: this.#options.gridElement,
      viewportElement: this.#options.viewportElement,
      focus,
      getRowKeys: () => this.#rows.map((row) => this.#options.keyOf(row)),
      rowHeight: this.#rowHeight,
      liveElement: this.#options.liveElement,
    });
  }

  #viewportSize(): number {
    const size = this.#options.viewportElement.clientHeight;
    return size > 0 ? size : FALLBACK_VIEWPORT;
  }

  #updateSpacer(): void {
    this.#options.spacerElement.style.blockSize = `${this.#rows.length * this.#rowHeight}px`;
    this.#options.gridElement.setAttribute(
      'aria-rowcount',
      String(this.#rows.length),
    );
  }

  #captureAnchor(): Anchor | null {
    if (this.#rows.length === 0) return null;
    const scrollTop = this.#options.viewportElement.scrollTop;
    const index = Math.min(
      Math.floor(scrollTop / this.#rowHeight),
      this.#rows.length - 1,
    );
    const row = this.#rows[index];
    if (!row) return null;
    return {
      key: this.#options.keyOf(row),
      offset: scrollTop - index * this.#rowHeight,
    };
  }

  #restoreAnchor(anchor: Anchor): void {
    const index = this.#rows.findIndex((row) =>
      Object.is(this.#options.keyOf(row), anchor.key),
    );
    if (index < 0) return;
    this.#options.viewportElement.scrollTop =
      index * this.#rowHeight + anchor.offset;
  }

  #layout(): {
    entries: readonly ColumnLayoutEntry<T>[];
    totalWidth: number;
  } {
    const layout = computeColumnLayout(
      this.#columns,
      this.#options.viewportElement.clientWidth,
      this.#options.viewportElement.scrollLeft,
    );
    return { entries: layout.columns, totalWidth: layout.totalWidth };
  }

  #columnIndex(columnId: string): number {
    return this.#columns.findIndex((column) => column.id === columnId) + 1;
  }

  #syncCells(entries: readonly ColumnLayoutEntry<T>[]): boolean {
    const signature = entries
      .map((entry) => `${entry.column.id}:${entry.width}`)
      .join('|');
    if (signature === this.#layoutSignature) return false;

    this.#templates.clear();
    this.#pool.forEach((rowElement) => {
      rowElement.replaceChildren();
      entries.forEach((entry) => {
        rowElement.append(
          createCell(entry, this.#columnIndex(entry.column.id)),
        );
      });
    });
    this.#layoutSignature = signature;
    return true;
  }

  #render(): void {
    if (this.#disposed) return;
    const layout = this.#layout();
    this.#virtualizer.setViewportSize(this.#viewportSize());
    this.#virtualizer.setItemCount(this.#rows.length);
    this.#virtualizer.setScrollOffset(this.#options.viewportElement.scrollTop);

    const { start, end, offsetTop } = this.#virtualizer.range;
    const count = Math.max(0, end - start);
    this.#ensurePool(count);
    this.#syncCells(layout.entries);
    this.#options.rowsElement.style.transform = `translateY(${offsetTop}px)`;
    this.#options.rowsElement.style.minInlineSize = `${layout.totalWidth}px`;
    this.#options.spacerElement.style.inlineSize = `${layout.totalWidth}px`;

    this.#pool.forEach((rowElement, poolIndex) => {
      const row = this.#rows[start + poolIndex];
      if (poolIndex >= count || !row) {
        rowElement.hidden = true;
        return;
      }
      this.#paintRow(rowElement, row, start + poolIndex, layout.entries);
    });
  }

  #paintRow(
    rowElement: HTMLElement,
    row: T,
    index: number,
    entries: readonly ColumnLayoutEntry<T>[],
  ): void {
    rowElement.hidden = false;
    rowElement.setAttribute('aria-rowindex', String(index + 1));
    const rowKey = this.#options.keyOf(row);
    rowElement.setAttribute('data-row-key', String(rowKey));
    rowElement.classList.toggle('sui-grid__row--even', index % 2 === 1);
    if (this.#options.isSelected) {
      rowElement.setAttribute(
        'aria-selected',
        String(this.#options.isSelected(row)),
      );
    }

    entries.forEach((entry, cellIndex) => {
      const cell = rowElement.children[cellIndex] as HTMLElement | undefined;
      if (!cell) return;
      cell.id = `${keyToDomId(rowKey)}-${encodeURIComponent(entry.column.id)}`;
      if (!cell.hasAttribute('tabindex')) cell.tabIndex = -1;

      const template = entry.column.cellTemplate;
      if (template) {
        this.#templates.mount(cell, template, {
          data: row,
          row,
          column: {
            field: entry.column.dataField ?? entry.column.id,
            caption: entry.column.caption,
          },
          index,
          value: cellValueFor(row, entry.column),
        });
        return;
      }

      this.#templates.unmount(cell);
      const text = formatRowCell(row, entry.column, {
        locale: this.#locale,
        placeholder: this.#options.emptyText,
      });
      if (cell.textContent !== text) cell.textContent = text;
    });
  }

  #ensurePool(size: number): void {
    while (this.#pool.length < size) {
      const rowElement = document.createElement('div');
      rowElement.className = 'sui-grid__row';
      rowElement.setAttribute('role', 'row');
      this.#options.rowsElement.append(rowElement);
      this.#pool.push(rowElement);
    }
  }

  setRows(next: readonly T[]): void {
    if (this.#disposed) return;
    const anchor = this.#captureAnchor();
    this.#rows = next;
    this.#updateSpacer();
    if (anchor) this.#restoreAnchor(anchor);
    this.#render();
  }

  setColumns(next: readonly ColumnState<T>[]): void {
    if (this.#disposed) return;
    this.#columns = getVisibleColumns(next);
    // Lepas template lama sebelum node dibuang, lalu bangun ulang struktur sel.
    this.#templates.clear();
    this.#pool.forEach((rowElement) => rowElement.remove());
    this.#pool.length = 0;
    this.#layoutSignature = '';
    this.#render();
  }

  getRenderedCount(): number {
    return this.#pool.filter((row) => !row.hidden).length;
  }

  setLocale(locale: string | undefined): void {
    this.#locale = locale;
    this.#render();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#options.viewportElement.removeEventListener('scroll', this.#onScroll);
    this.#detachKeyboard?.();
    this.#unsubscribeSelection?.();
    this.#templates.dispose();
    this.#pool.forEach((rowElement) => rowElement.remove());
    this.#pool.length = 0;
  }
}

export function createRowRenderer<T extends object>(
  options: RowRendererOptions<T>,
): RowRenderer<T> {
  return new VirtualRowRenderer(options);
}
