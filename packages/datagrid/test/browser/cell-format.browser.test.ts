import { describe, expect, it } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
  amount: number | null;
  flag: boolean;
  name: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  {
    dataField: 'amount',
    caption: 'Jumlah',
    dataType: 'number',
    format: { type: 'decimal', precision: 2 },
  },
  { dataField: 'flag', caption: 'Aktif', dataType: 'boolean' },
  { dataField: 'name', caption: 'Nama' },
]);

const ROWS: Row[] = [
  { id: 1, amount: 1234.5, flag: true, name: '<b>Ani</b>' },
  { id: 2, amount: null, flag: false, name: '' },
];

function setup() {
  const container = document.createElement('div');
  container.style.height = '200px';
  container.style.width = '500px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: ROWS.length,
    rowHeight: 40,
  });
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns: COLUMNS,
    rows: ROWS,
    keyOf: (row) => row.id,
    rowHeight: 40,
    locale: 'id-ID',
  });
  const cellsOf = (rowIndex: number): string[] =>
    [
      ...(grid.rowsElement.children[rowIndex] as HTMLElement).querySelectorAll(
        '[role="gridcell"]',
      ),
    ].map((cell) => cell.textContent ?? '');
  return { container, grid, renderer, cellsOf };
}

describe('cell format di renderer', () => {
  it('memformat angka per locale dan boolean', () => {
    const { container, grid, renderer, cellsOf } = setup();

    expect(cellsOf(0)[0]).toBe('1.234,50');
    expect(cellsOf(0)[1]).toBe('Ya');
    expect(cellsOf(1)[1]).toBe('Tidak');

    renderer.dispose();
    container.remove();
    void grid;
  });

  it('null menjadi placeholder dan string kosong tetap kosong', () => {
    const { container, renderer, cellsOf } = setup();

    expect(cellsOf(1)[0]).toBe('—');
    expect(cellsOf(1)[2]).toBe('');

    renderer.dispose();
    container.remove();
  });

  it('html pada nilai dirender sebagai teks murni', () => {
    const { container, grid, renderer } = setup();
    const cell = grid.rowsElement.querySelector(
      '[role="gridcell"][data-column-id="name"]',
    );

    expect(cell?.textContent).toBe('<b>Ani</b>');
    expect(cell?.querySelector('b')).toBeNull();

    renderer.dispose();
    container.remove();
  });
});
