import { describe, expect, it } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
  name: string;
  total: number;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'id', caption: 'ID', width: 80 },
  {
    dataField: 'name',
    caption: 'Nama',
    width: 160,
    calculateCellValue: (row: Row) => row.name.toUpperCase(),
  },
  { dataField: 'total', caption: 'Total', width: 120, dataType: 'number' },
]);

function makeRows(count: number, offset = 0): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: offset + index + 1,
    name: `Nama ${offset + index + 1}`,
    total: offset + index + 1,
  }));
}

function setup(rows: Row[] = makeRows(1000)) {
  const container = document.createElement('div');
  container.style.height = '300px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: rows.length,
    rowHeight: 40,
  });
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns: COLUMNS,
    rows,
    keyOf: (row) => row.id,
    rowHeight: 40,
    overscan: 2,
  });
  return { container, grid, renderer };
}

describe('RowRenderer — virtualisasi', () => {
  it('hanya merender baris di viewport + overscan', () => {
    const { renderer, grid, container } = setup();

    const rendered = renderer.getRenderedCount();
    expect(rendered).toBeGreaterThan(5);
    expect(rendered).toBeLessThanOrEqual(15);
    expect(grid.element.getAttribute('aria-rowcount')).toBe('1000');
    expect(grid.spacerElement.style.blockSize).toBe('40000px');

    renderer.dispose();
    container.remove();
  });

  it('merender sel dengan kalkulasi kolom dan aria yang benar', () => {
    const { renderer, grid, container } = setup();
    const firstRow = grid.rowsElement.firstElementChild as HTMLElement;

    expect(firstRow.getAttribute('role')).toBe('row');
    expect(firstRow.getAttribute('aria-rowindex')).toBe('1');
    expect(firstRow.getAttribute('data-row-key')).toBe('1');

    const cells = firstRow.querySelectorAll('[role="gridcell"]');
    expect(cells).toHaveLength(3);
    expect(cells[0]?.textContent).toBe('1');
    expect(cells[1]?.textContent).toBe('NAMA 1');
    expect(cells[2]?.getAttribute('aria-colindex')).toBe('3');

    renderer.dispose();
    container.remove();
  });

  it('scroll menggeser jendela dan mendaur ulang node', () => {
    const { renderer, grid, container } = setup();
    const firstNode = grid.rowsElement.children[0] as HTMLElement;

    grid.viewportElement.scrollTop = 4000;
    grid.viewportElement.dispatchEvent(new Event('scroll'));

    const rowIndex = Number(firstNode.getAttribute('aria-rowindex'));
    expect(rowIndex).toBeGreaterThan(90);
    expect(rowIndex).toBeLessThanOrEqual(100);
    expect(grid.rowsElement.children[0]).toBe(firstNode);

    renderer.dispose();
    container.remove();
  });

  it('menjaga jumlah node konstan untuk 100k baris', () => {
    const { renderer, grid, container } = setup(makeRows(100_000));
    const before = grid.rowsElement.childElementCount;

    grid.viewportElement.scrollTop = 2_000_000;
    grid.viewportElement.dispatchEvent(new Event('scroll'));

    expect(grid.element.getAttribute('aria-rowcount')).toBe('100000');
    // Pool boleh tumbuh sedikit saat offset berubah, tetapi tetap konstan
    // terhadap jumlah baris (bukan 100k node).
    expect(grid.rowsElement.childElementCount).toBeLessThanOrEqual(before + 4);
    expect(renderer.getRenderedCount()).toBeLessThanOrEqual(15);

    renderer.dispose();
    container.remove();
  });
});

describe('RowRenderer — pembaruan dan anchoring', () => {
  it('setRows memperbarui aria, spacer, dan isi', () => {
    const { renderer, grid, container } = setup();
    renderer.setRows(makeRows(10));

    expect(grid.element.getAttribute('aria-rowcount')).toBe('10');
    expect(grid.spacerElement.style.blockSize).toBe('400px');
    const cell = grid.rowsElement.querySelector('[role="gridcell"]');
    expect(cell?.textContent).toBe('1');

    renderer.dispose();
    container.remove();
  });

  it('scroll anchoring mempertahankan baris yang terlihat saat data ditambah di atas', () => {
    const rows = makeRows(1000);
    const { renderer, grid, container } = setup(rows);

    const anchorIndex = 100;
    grid.viewportElement.scrollTop = anchorIndex * 40;
    grid.viewportElement.dispatchEvent(new Event('scroll'));
    const anchorKey = rows[anchorIndex]?.id;
    expect(anchorKey).toBe(101);

    renderer.setRows([...makeRows(5, 5000), ...rows]);

    expect(grid.viewportElement.scrollTop).toBe((anchorIndex + 5) * 40);
    const visibleKeys = [...grid.rowsElement.children]
      .filter((row) => !(row as HTMLElement).hidden)
      .map((row) => (row as HTMLElement).getAttribute('data-row-key'));
    expect(visibleKeys).toContain(String(anchorKey));

    renderer.dispose();
    container.remove();
  });

  it('data kosong tidak merender baris', () => {
    const { renderer, grid, container } = setup();
    renderer.setRows([]);

    expect(renderer.getRenderedCount()).toBe(0);
    expect(grid.element.getAttribute('aria-rowcount')).toBe('0');
    expect(grid.spacerElement.style.blockSize).toBe('0px');

    renderer.dispose();
    container.remove();
  });

  it('setColumns mengganti struktur sel', () => {
    const { renderer, grid, container } = setup();
    renderer.setColumns(
      normalizeColumnModel<Row>([{ dataField: 'name', caption: 'Nama' }]),
    );

    const firstRow = grid.rowsElement.firstElementChild as HTMLElement;
    expect(firstRow.querySelectorAll('[role="gridcell"]')).toHaveLength(1);
    expect(firstRow.textContent).toBe('Nama 1');

    renderer.dispose();
    container.remove();
  });

  it('dispose menghentikan listener dan membersihkan baris', () => {
    const { renderer, grid, container } = setup();
    renderer.dispose();

    grid.viewportElement.scrollTop = 4000;
    grid.viewportElement.dispatchEvent(new Event('scroll'));

    expect(grid.rowsElement.childElementCount).toBe(0);
    container.remove();
  });
});
