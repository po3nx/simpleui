import { describe, expect, it } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
  name: string;
  city: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 200 },
  { dataField: 'city', caption: 'Kota', width: 200 },
  { dataField: 'id', caption: 'ID', width: 200 },
]);

function rows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Nama ${index + 1}`,
    city: 'Jakarta',
  }));
}

function setup(width: string, height = '220px', data = rows(20)) {
  const container = document.createElement('div');
  container.style.width = width;
  container.style.height = height;
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: data.length,
    rowHeight: 40,
    footer: true,
    summaryItems: [{ column: 'id', summaryType: 'sum' }],
    summaryRows: data,
  });
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns: COLUMNS,
    rows: data,
    keyOf: (row) => row.id,
  });
  return { container, grid, renderer };
}

describe('layout — scroll horizontal', () => {
  it('tidak menampilkan scrollbar horizontal jika kolom muat', () => {
    const { container, grid, renderer } = setup('900px');
    expect(grid.viewportElement.scrollWidth).toBeLessThanOrEqual(
      grid.viewportElement.clientWidth + 1,
    );
    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('header dan baris tetap sejajar setelah scroll horizontal', () => {
    const { container, grid, renderer } = setup('320px');
    const viewport = grid.viewportElement;
    expect(viewport.scrollWidth).toBeGreaterThan(viewport.clientWidth);

    viewport.scrollLeft = 150;
    viewport.dispatchEvent(new Event('scroll'));

    const header = grid.headerElement.querySelector<HTMLElement>(
      '[data-column-id="city"]',
    );
    const cell = grid.rowsElement.querySelector<HTMLElement>(
      '[data-column-id="city"]',
    );
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

  it('baris terakhir tidak tertutup footer summary', () => {
    const { container, grid, renderer } = setup('900px');
    const viewport = grid.viewportElement;
    viewport.scrollTop = viewport.scrollHeight;

    const visible = [
      ...grid.rowsElement.querySelectorAll<HTMLElement>(
        '[role="row"]:not([hidden])',
      ),
    ];
    const last = visible.at(-1);
    const footer = grid.footerElement;
    expect(last).toBeDefined();
    expect(
      (last?.getBoundingClientRect().bottom ?? 0) <=
        footer.getBoundingClientRect().top + 1,
    ).toBe(true);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
