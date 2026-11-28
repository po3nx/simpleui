import type { ColumnState } from '../model/columns.js';
import { exportColumns, valueForExport } from '../data/export.js';

/**
 * Print view DataGrid (DG-072): tabel statis semua baris untuk media print,
 * header berulang, page-break terkendali, dan pembersihan setelah print.
 */

export interface PrintGridOptions<T extends object> {
  readonly rows: readonly T[];
  readonly columns: readonly ColumnState<T>[];
  readonly title?: string;
  readonly pageBreakEvery?: number;
}

export interface PrintView {
  readonly element: HTMLTableElement;
  print(): void;
  dispose(): void;
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

export function createPrintView<T extends object>(
  options: PrintGridOptions<T>,
): PrintView {
  const table = document.createElement('table');
  table.className = 'sui-grid-print';
  const caption = document.createElement('caption');
  caption.textContent = options.title ?? 'DataGrid';
  table.append(caption);
  const columns = exportColumns(options.columns);

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const column of columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = column.caption;
    headRow.append(th);
  }
  thead.append(headRow);
  const tbody = document.createElement('tbody');
  options.rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    for (const column of columns) {
      const td = document.createElement('td');
      td.textContent = text(valueForExport(row, column));
      tr.append(td);
    }
    tbody.append(tr);
    if (
      options.pageBreakEvery &&
      options.pageBreakEvery > 0 &&
      (index + 1) % options.pageBreakEvery === 0 &&
      index + 1 < options.rows.length
    ) {
      const gap = document.createElement('tr');
      gap.className = 'sui-grid-print__break';
      const cell = document.createElement('td');
      cell.colSpan = columns.length;
      gap.append(cell);
      tbody.append(gap);
    }
  });
  table.append(thead, tbody);

  let cleaned = false;
  const dispose = (): void => {
    if (cleaned) return;
    cleaned = true;
    table.remove();
  };
  return {
    element: table,
    print() {
      document.body.append(table);
      window.addEventListener('afterprint', dispose, { once: true });
      window.print();
    },
    dispose,
  };
}

export function printGrid<T extends object>(
  options: PrintGridOptions<T>,
): PrintView {
  const view = createPrintView(options);
  view.print();
  return view;
}

export type { ColumnState };
