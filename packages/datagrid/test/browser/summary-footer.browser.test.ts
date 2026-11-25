import type { SummaryItem } from '../../src/api/types.js';
import { describe, expect, it } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';

interface Row {
  name: string;
  total: number;
  qty: number;
  secret: number;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 120 },
  { dataField: 'total', caption: 'Total', width: 120, dataType: 'number' },
  { dataField: 'qty', caption: 'Qty', width: 80, dataType: 'number' },
  { dataField: 'secret', caption: 'Rahasia', width: 80, visible: false },
]);

const ROWS: Row[] = [
  { name: 'A', total: 1234.5, qty: 2, secret: 1 },
  { name: 'B', total: 10, qty: 3, secret: 2 },
  { name: 'C', total: 5, qty: 4, secret: 3 },
];

const ITEMS: SummaryItem<Row>[] = [
  { column: 'total', summaryType: 'sum', displayFormat: 'Total: {0}' },
  {
    column: 'qty',
    summaryType: 'count',
    customizeText: ({ value }) => `${String(value)} baris`,
  },
];

function setup(items: SummaryItem<Row>[] = ITEMS) {
  const container = document.createElement('div');
  container.style.width = '600px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: ROWS.length,
    summaryItems: items,
    summaryRows: ROWS,
    summaryLocale: 'id-ID',
    pager: true,
    pageIndex: 0,
    pageSize: 20,
    totalCount: ROWS.length,
  });
  const footer = (): HTMLElement | undefined => grid.summaryFooter?.element;
  const cells = (): HTMLElement[] => [
    ...(footer()?.querySelectorAll<HTMLElement>('[role="gridcell"]') ?? []),
  ];
  return { container, grid, footer, cells };
}

describe('summary footer — render', () => {
  it('merender total per kolom dengan format locale dan displayFormat', () => {
    const { container, grid, footer, cells } = setup();

    expect(grid.footerElement.hidden).toBe(false);
    expect(footer()?.getAttribute('role')).toBe('row');
    expect(cells().map((cell) => cell.textContent)).toEqual([
      '',
      'Total: 1.249,5',
      '3 baris',
    ]);
    expect(cells().map((cell) => cell.getAttribute('data-column-id'))).toEqual([
      'name',
      'total',
      'qty',
    ]);
    expect(cells()[1]?.getAttribute('aria-label')).toBe(
      'Total: Total: 1.249,5',
    );
    expect(cells()[1]?.style.justifyContent).toBe('flex-end');

    grid.dispose();
    container.remove();
  });

  it('menyembunyikan sel kolom tersembunyi', () => {
    const { container, grid, cells } = setup();
    expect(
      cells().some((cell) => cell.getAttribute('data-column-id') === 'secret'),
    ).toBe(false);
    grid.dispose();
    container.remove();
  });

  it('footer tetap menampilkan pager bersama summary', () => {
    const { container, grid, footer } = setup();
    expect(footer()).not.toBeUndefined();
    expect(grid.pager).toBeDefined();
    expect(grid.footerElement.querySelector('.sui-grid__pager')).not.toBeNull();
    grid.dispose();
    container.remove();
  });
});

describe('summary footer — pembaruan', () => {
  it('setSummaryRows menghitung ulang, termasuk data kosong', () => {
    const { container, grid, cells } = setup();

    grid.setSummaryRows([{ name: 'D', total: 1.5, qty: 1, secret: 0 }]);
    expect(cells()[1]?.textContent).toBe('Total: 1,5');
    expect(cells()[2]?.textContent).toBe('1 baris');

    grid.setSummaryRows([]);
    expect(cells()[1]?.textContent).toBe('Total: 0');
    expect(cells()[2]?.textContent).toBe('0 baris');

    grid.dispose();
    container.remove();
  });

  it('formatter yang melempar error menghasilkan em dash', () => {
    const { container, grid, cells } = setup([
      {
        column: 'total',
        summaryType: 'sum',
        customizeText: () => {
          throw new Error('boom');
        },
      },
    ]);

    expect(cells()[1]?.textContent).toBe('—');

    grid.dispose();
    container.remove();
  });
});
