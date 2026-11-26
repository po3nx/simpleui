import { describe, expect, it } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createFocusModel } from '../../src/model/focus.js';
import { createGridStateStore } from '../../src/model/state.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
  name: string;
  total: number;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 120 },
  { dataField: 'total', caption: 'Total', width: 100 },
]);

const ROWS: Row[] = [
  { id: 1, name: 'Ani', total: 10 },
  { id: 2, name: 'Budi', total: 20 },
  { id: 3, name: 'Cici', total: 30 },
];

function setup(mode: 'none' | 'single' | 'multiple' = 'multiple') {
  const container = document.createElement('div');
  container.style.width = '600px';
  container.style.height = '300px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: ROWS.length,
    rowHeight: 40,
    selectionMode: mode,
    rowKey: (row) => row.id,
    getVisibleKeys: () => ROWS.map((row) => row.id),
  });
  const focus = createFocusModel<Row>({
    state: createGridStateStore(),
    columns: COLUMNS,
    getRowKeys: () => ROWS.map((row) => row.id),
  });
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns: grid.selectionColumn
      ? [grid.selectionColumn as never, ...COLUMNS]
      : COLUMNS,
    rows: ROWS,
    keyOf: (row) => row.id,
    isSelected: (row) => grid.isSelectedKey(row.id),
    selectionChanges: (listener) => grid.subscribeSelection(listener),
    liveElement: grid.liveElement,
    focus,
  });
  const rows = (): HTMLElement[] =>
    [...grid.rowsElement.querySelectorAll<HTMLElement>('[role="row"]')].filter(
      (row) => row.querySelector('[role="gridcell"]') !== null && !row.hidden,
    );
  const live = (): string => grid.liveElement.textContent ?? '';
  return {
    container,
    grid,
    renderer,
    rows,
    live,
    press: (key: string) => {
      grid.element.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true }),
      );
    },
  };
}

describe('ARIA grid pattern', () => {
  it('memberi nama grid dan aria-multiselectable sesuai mode', () => {
    const { container, grid, renderer } = setup('multiple');
    expect(grid.element.getAttribute('aria-label')).toBe('Data grid');
    expect(grid.element.getAttribute('aria-multiselectable')).toBe('true');
    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('label grid dapat diganti dan mode single tanpa multiselectable', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const grid = createGridView<Row>({
      container,
      columns: COLUMNS,
      rowCount: 1,
      label: 'Tabel penjualan',
      selectionMode: 'single',
      rowKey: (row) => row.id,
    });
    expect(grid.element.getAttribute('aria-label')).toBe('Tabel penjualan');
    expect(grid.element.hasAttribute('aria-multiselectable')).toBe(false);
    grid.dispose();
    container.remove();
  });

  it('menandai baris terpilih dan mengumumkan seleksi', () => {
    const { container, grid, renderer, rows, live } = setup();
    expect(rows()[0]?.getAttribute('aria-selected')).toBe('false');

    const checkbox = grid.rowsElement.querySelector<HTMLInputElement>(
      '[role="gridcell"] input[type="checkbox"]',
    );
    checkbox?.click();

    expect(rows()[0]?.getAttribute('aria-selected')).toBe('true');
    expect(live()).toContain('baris dipilih');

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('aria-busy aktif selama loading', () => {
    const { container, grid, renderer } = setup();
    grid.setStatus('loading');
    expect(grid.element.getAttribute('aria-busy')).toBe('true');

    grid.setStatus(null);
    expect(grid.element.hasAttribute('aria-busy')).toBe(false);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('mengumumkan posisi fokus keyboard', () => {
    const { container, grid, renderer, live, press } = setup('none');
    press('ArrowDown');
    expect(live()).toMatch(/Baris 1, kolom 1/);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
