import type { SummaryItem } from '../api/types.js';
import type { ColumnState } from '../model/columns.js';
import { computeSummary, formatSummary } from '../data/summary.js';

/**
 * Summary footer DataGrid (DG-048): total per kolom dengan format locale,
 * displayFormat, dan customizeText; error formatter diisolasi.
 */

export interface SummaryFooterOptions<T extends object> {
  readonly columns: readonly ColumnState<T>[];
  readonly items: readonly SummaryItem<T>[];
  readonly rows: readonly T[];
  readonly locale?: string | undefined;
}

export interface SummaryFooter<T extends object> {
  readonly element: HTMLElement;
  setRows(rows: readonly T[]): void;
  setColumns(columns: readonly ColumnState<T>[]): void;
  setItems(items: readonly SummaryItem<T>[]): void;
  setLocale(locale: string): void;
  dispose(): void;
}

function visibleColumns<T extends object>(
  columns: readonly ColumnState<T>[],
): readonly ColumnState<T>[] {
  return columns.filter((column) => column.visible && !column.children);
}

class SummaryFooterImpl<T extends object> implements SummaryFooter<T> {
  readonly element: HTMLElement;
  #columns: readonly ColumnState<T>[];
  #items: readonly SummaryItem<T>[];
  #rows: readonly T[];
  #locale: string;

  constructor(options: SummaryFooterOptions<T>) {
    this.element = document.createElement('div');
    this.element.className = 'sui-grid__row sui-grid__row--summary';
    this.element.setAttribute('role', 'row');
    this.#columns = options.columns;
    this.#items = options.items;
    this.#rows = options.rows;
    this.#locale = options.locale ?? 'en';
    this.#render();
  }

  setRows(rows: readonly T[]): void {
    this.#rows = rows;
    this.#render();
  }

  setColumns(columns: readonly ColumnState<T>[]): void {
    this.#columns = columns;
    this.#render();
  }

  setItems(items: readonly SummaryItem<T>[]): void {
    this.#items = items;
    this.#render();
  }

  setLocale(locale: string): void {
    this.#locale = locale;
    this.#render();
  }

  #render(): void {
    const columns = visibleColumns(this.#columns);
    const itemsByColumn = new Map(
      this.#items.map((item) => [item.column, item]),
    );
    const values = computeSummary(this.#rows, {
      columns: this.#columns,
      items: this.#items,
    });

    this.element.replaceChildren();
    columns.forEach((column, index) => {
      const cell = document.createElement('div');
      cell.className = 'sui-grid__cell sui-grid__cell--summary';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-colindex', String(index + 1));
      cell.setAttribute('data-column-id', column.id);
      const width = column.width === 'auto' ? column.minWidth : column.width;
      cell.style.flexBasis = `${width}px`;
      cell.style.justifyContent =
        column.alignment === 'end'
          ? 'flex-end'
          : column.alignment === 'center'
            ? 'center'
            : 'flex-start';

      const item = itemsByColumn.get(column.id);
      const value = values[column.id];
      if (item && value !== undefined) {
        const text = formatSummary(item, {
          value,
          data: this.#rows,
          locale: this.#locale,
        });
        cell.textContent = text;
        cell.setAttribute('aria-label', `${column.caption}: ${text}`);
      }
      this.element.append(cell);
    });
  }

  dispose(): void {
    this.element.remove();
  }
}

export function createSummaryFooter<T extends object>(
  options: SummaryFooterOptions<T>,
): SummaryFooter<T> {
  return new SummaryFooterImpl(options);
}
