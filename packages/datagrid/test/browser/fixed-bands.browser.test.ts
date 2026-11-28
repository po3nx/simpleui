import { describe, expect, it } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
  name: string;
  age: number;
  city: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ani', age: 30, city: 'Jakarta' },
  { id: 2, name: 'Budi', age: 41, city: 'Bandung' },
];

function mount(
  columnsInput: Parameters<typeof normalizeColumnModel<Row>>[0],
  rtl = false,
) {
  const columns = normalizeColumnModel<Row>(columnsInput);
  const container = document.createElement('div');
  container.style.width = '320px';
  container.style.height = '240px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns,
    rowCount: ROWS.length,
    rowHeight: 40,
    rtl,
  });
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns,
    rows: ROWS,
    keyOf: (row) => row.id,
    rtl,
  });
  return { container, grid, renderer, columns };
}

describe('band header', () => {
  it('merender band cell colspan dan baris leaf', () => {
    const { container, grid, renderer } = mount([
      {
        caption: 'Info',
        columns: [
          { dataField: 'name', caption: 'Nama', width: 140 },
          { dataField: 'age', caption: 'Usia', width: 100 },
        ],
      },
      {
        caption: 'Lokasi',
        columns: [{ dataField: 'city', caption: 'Kota', width: 140 }],
      },
    ]);

    const bands = [
      ...grid.headerElement.querySelectorAll<HTMLElement>(
        '.sui-grid__header-cell--band',
      ),
    ];
    expect(bands).toHaveLength(2);
    expect(bands[0]?.textContent).toBe('Info');
    expect(bands[0]?.getAttribute('aria-colspan')).toBe('2');
    expect(bands[1]?.getAttribute('aria-colspan')).toBe('1');
    expect(
      grid.headerElement.querySelectorAll(
        '[role="columnheader"]:not(.sui-grid__header-cell--band)',
      ),
    ).toHaveLength(3);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});

describe('fixed columns', () => {
  it('kolom start sticky dan shadow muncul saat scroll', () => {
    const { container, grid, renderer } = mount([
      { dataField: 'id', caption: 'ID', width: 100, fixed: 'start' },
      { dataField: 'name', caption: 'Nama', width: 180 },
      { dataField: 'city', caption: 'Kota', width: 180 },
    ]);
    const header = grid.headerElement.querySelector<HTMLElement>(
      '[data-column-id="id"]',
    );
    expect(header?.style.position).toBe('sticky');
    expect(header?.style.insetInlineStart).toBe('0px');

    grid.viewportElement.scrollLeft = 120;
    grid.viewportElement.dispatchEvent(new Event('scroll'));

    const scrolledHeader = grid.headerElement.querySelector<HTMLElement>(
      '[data-column-id="id"]',
    );
    expect(
      scrolledHeader?.classList.contains('sui-grid__header-cell--shadow-start'),
    ).toBe(true);
    const rowCell = grid.rowsElement.querySelector<HTMLElement>(
      '[data-column-id="id"]',
    );
    expect(rowCell?.classList.contains('sui-grid__cell--shadow-start')).toBe(
      true,
    );

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('kolom fixed start tetap sejajar di RTL', () => {
    const { container, grid, renderer } = mount(
      [
        { dataField: 'id', caption: 'ID', width: 100, fixed: 'start' },
        { dataField: 'name', caption: 'Nama', width: 180 },
      ],
      true,
    );
    grid.viewportElement.scrollLeft = 80;
    grid.viewportElement.dispatchEvent(new Event('scroll'));
    const header = grid.headerElement.querySelector<HTMLElement>(
      '[data-column-id="id"]',
    );
    const cell = grid.rowsElement.querySelector<HTMLElement>(
      '[data-column-id="id"]',
    );
    expect(header?.style.position).toBe('sticky');
    expect(
      Math.abs(
        (header?.getBoundingClientRect().left ?? 0) -
          (cell?.getBoundingClientRect().left ?? 0),
      ),
    ).toBeLessThan(1);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
