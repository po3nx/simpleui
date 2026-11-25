import { Virtualizer, type Key } from '@simpleui/core';

import { getVisibleColumns, type ColumnState } from '../model/columns.js';

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
}

export interface RowRenderer<T extends object> {
  setRows(rows: readonly T[]): void;
  setColumns(columns: readonly ColumnState<T>[]): void;
  getRenderedCount(): number;
  dispose(): void;
}

const DEFAULT_ROW_HEIGHT = 40;
const FALLBACK_VIEWPORT = 320;

interface Anchor {
  readonly key: Key;
  readonly offset: number;
}

function cellText<T extends object>(column: ColumnState<T>, row: T): string {
  if (column.calculateCellValue) {
    const computed = column.calculateCellValue(row);
    return computed === null || computed === undefined ? '' : String(computed);
  }
  if (!column.dataField) return '';
  const value = (row as Record<string, unknown>)[column.dataField];
  return value === null || value === undefined ? '' : String(value);
}

function justifyFor(alignment: ColumnState['alignment']): string {
  if (alignment === 'end') return 'flex-end';
  if (alignment === 'center') return 'center';
  return 'flex-start';
}

function appendCells<T extends object>(
  rowElement: HTMLElement,
  columns: readonly ColumnState<T>[],
): void {
  columns.forEach((column, index) => {
    const cell = document.createElement('div');
    cell.className = 'sui-grid__cell';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-colindex', String(index + 1));
    cell.setAttribute('data-column-id', column.id);
    const width = column.width === 'auto' ? column.minWidth : column.width;
    cell.style.flexBasis = `${width}px`;
    cell.style.justifyContent = justifyFor(column.alignment);
    rowElement.append(cell);
  });
}

function updateCells<T extends object>(
  rowElement: HTMLElement,
  columns: readonly ColumnState<T>[],
  row: T,
): void {
  const cells = rowElement.children;
  columns.forEach((column, index) => {
    const cell = cells[index] as HTMLElement | undefined;
    if (!cell) return;
    const text = cellText(column, row);
    if (cell.textContent !== text) cell.textContent = text;
  });
}

class VirtualRowRenderer<T extends object> implements RowRenderer<T> {
  readonly #options: RowRendererOptions<T>;
  readonly #rowHeight: number;
  readonly #overscan: number;
  readonly #virtualizer: Virtualizer;
  readonly #pool: HTMLElement[] = [];
  #rows: readonly T[];
  #columns: readonly ColumnState<T>[];
  #disposed = false;

  constructor(options: RowRendererOptions<T>) {
    this.#options = options;
    this.#rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;
    this.#overscan = options.overscan ?? 5;
    this.#rows = options.rows;
    this.#columns = getVisibleColumns(options.columns);
    this.#virtualizer = new Virtualizer({
      itemCount: this.#rows.length,
      itemSize: this.#rowHeight,
      viewportSize: FALLBACK_VIEWPORT,
      overscan: this.#overscan,
    });

    options.viewportElement.addEventListener('scroll', this.#onScroll, {
      passive: true,
    });
    this.#updateSpacer();
    this.#render();
  }

  readonly #onScroll = (): void => this.#render();

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

  #ensurePool(size: number): void {
    while (this.#pool.length < size) {
      const rowElement = document.createElement('div');
      rowElement.className = 'sui-grid__row';
      rowElement.setAttribute('role', 'row');
      appendCells(rowElement, this.#columns);
      this.#options.rowsElement.append(rowElement);
      this.#pool.push(rowElement);
    }
  }

  #render(): void {
    if (this.#disposed) return;
    this.#virtualizer.setViewportSize(this.#viewportSize());
    this.#virtualizer.setItemCount(this.#rows.length);
    this.#virtualizer.setScrollOffset(this.#options.viewportElement.scrollTop);

    const { start, end, offsetTop } = this.#virtualizer.range;
    const count = Math.max(0, end - start);
    this.#ensurePool(count);
    this.#options.rowsElement.style.transform = `translateY(${offsetTop}px)`;

    this.#pool.forEach((rowElement, poolIndex) => {
      const row = this.#rows[start + poolIndex];
      if (poolIndex >= count || !row) {
        rowElement.hidden = true;
        return;
      }
      this.#paintRow(rowElement, row, start + poolIndex);
    });
  }

  #paintRow(rowElement: HTMLElement, row: T, index: number): void {
    rowElement.hidden = false;
    rowElement.setAttribute('aria-rowindex', String(index + 1));
    rowElement.setAttribute('data-row-key', String(this.#options.keyOf(row)));
    rowElement.classList.toggle('sui-grid__row--even', index % 2 === 1);
    updateCells(rowElement, this.#columns, row);
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
    this.#pool.forEach((rowElement) => rowElement.remove());
    this.#pool.length = 0;
    this.#render();
  }

  getRenderedCount(): number {
    return this.#pool.filter((row) => !row.hidden).length;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#options.viewportElement.removeEventListener('scroll', this.#onScroll);
    this.#pool.forEach((rowElement) => rowElement.remove());
    this.#pool.length = 0;
  }
}

export function createRowRenderer<T extends object>(
  options: RowRendererOptions<T>,
): RowRenderer<T> {
  return new VirtualRowRenderer(options);
}
