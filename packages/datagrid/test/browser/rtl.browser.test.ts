import { describe, expect, it, vi } from 'vitest';
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
  { dataField: 'name', caption: 'Nama', width: 100, minWidth: 60 },
  { dataField: 'total', caption: 'Total', width: 100, minWidth: 60 },
]);
const ROWS: Row[] = [
  { id: 1, name: 'Ani', total: 10 },
  { id: 2, name: 'Budi', total: 20 },
];

function setup() {
  const container = document.createElement('div');
  container.style.width = '500px';
  container.style.height = '200px';
  document.body.append(container);
  const onReorder = vi.fn();
  const state = createGridStateStore();
  const focus = createFocusModel<Row>({
    state,
    columns: COLUMNS,
    getRowKeys: () => ROWS.map((row) => row.id),
  });
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: ROWS.length,
    rowHeight: 40,
    rtl: true,
    onColumnReorder: onReorder,
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
    focus,
    rtl: true,
  });
  const press = (key: string, target: EventTarget, init = {}) =>
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, ...init }),
    );
  return { container, grid, renderer, onReorder, focus, press };
}

describe('RTL — navigasi keyboard', () => {
  it('ArrowLeft pindah ke kolom berikutnya secara logis, ArrowRight kembali', () => {
    const { container, grid, renderer, focus, press } = setup();
    press('ArrowDown', grid.element);
    expect((document.activeElement as HTMLElement).id).toBe(
      focus.cellDomId(1, 'name'),
    );

    press('ArrowLeft', document.activeElement as HTMLElement);
    expect((document.activeElement as HTMLElement).id).toBe(
      focus.cellDomId(1, 'total'),
    );

    press('ArrowRight', document.activeElement as HTMLElement);
    expect((document.activeElement as HTMLElement).id).toBe(
      focus.cellDomId(1, 'name'),
    );

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});

describe('RTL — resize dan reorder', () => {
  it('ArrowRight pada handle memperkecil lebar di RTL', () => {
    const { container, grid, renderer } = setup();
    const handle = grid.headerElement.querySelector<HTMLElement>(
      '[data-column-id="name"] .sui-grid__resize-handle',
    );
    handle?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    const rowCell = grid.rowsElement.querySelector<HTMLElement>(
      '[data-column-id="name"]',
    );
    expect(rowCell?.style.flexBasis).toBe('90px');
    expect(handle?.getAttribute('aria-valuenow')).toBe('90');

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('Alt+ArrowLeft memindah kolom ke kanan secara logis di RTL', () => {
    const { container, grid, renderer, onReorder } = setup();
    const button = grid.headerElement.querySelector<HTMLElement>(
      '[data-column-id="name"] .sui-grid__header-button',
    );
    button?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        altKey: true,
        bubbles: true,
      }),
    );
    expect(onReorder).toHaveBeenCalledWith(['total', 'name']);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
