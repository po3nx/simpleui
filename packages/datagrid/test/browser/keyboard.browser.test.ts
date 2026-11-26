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
  note: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 120 },
  { dataField: 'total', caption: 'Total', width: 100, dataType: 'number' },
  { dataField: 'note', caption: 'Catatan', width: 140 },
]);

const ROWS: Row[] = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  name: `Nama ${index + 1}`,
  total: index,
  note: `Catatan ${index + 1}`,
}));

function setup(options: { filterRow?: boolean } = {}) {
  const container = document.createElement('div');
  container.style.width = '600px';
  container.style.height = '200px';
  document.body.append(container);
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
    filterRow: options.filterRow,
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
  });
  const press = (
    key: string,
    target: EventTarget,
    init: KeyboardEventInit = {},
  ) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, ...init });
    target.dispatchEvent(event);
    return event;
  };
  const focusedId = (): string =>
    (document.activeElement as HTMLElement)?.id ?? '';
  return { container, grid, renderer, focus, press, focusedId };
}

describe('keyboard — navigasi sel', () => {
  it('grid adalah satu tab stop dan ArrowDown memfokuskan sel pertama', () => {
    const { container, grid, renderer, focus, press, focusedId } = setup();
    expect(grid.element.tabIndex).toBe(0);

    press('ArrowDown', grid.element);
    expect(focusedId()).toBe(focus.cellDomId(1, 'name'));

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('panah kanan/bawah berpindah kolom dan baris', () => {
    const { container, grid, renderer, focus, press, focusedId } = setup();
    press('ArrowDown', grid.element);

    press('ArrowRight', document.activeElement as HTMLElement);
    expect(focusedId()).toBe(focus.cellDomId(1, 'total'));

    press('ArrowDown', document.activeElement as HTMLElement);
    expect(focusedId()).toBe(focus.cellDomId(2, 'total'));

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('Home/End baris dan Ctrl+Home/End grid', () => {
    const { container, grid, renderer, focus, press, focusedId } = setup();
    press('ArrowDown', grid.element);

    press('End', document.activeElement as HTMLElement);
    expect(focusedId()).toBe(focus.cellDomId(1, 'note'));

    press('Home', document.activeElement as HTMLElement);
    expect(focusedId()).toBe(focus.cellDomId(1, 'name'));

    press('End', document.activeElement as HTMLElement, { ctrlKey: true });
    expect(focusedId()).toBe(focus.cellDomId(20, 'note'));

    press('Home', document.activeElement as HTMLElement, { ctrlKey: true });
    expect(focusedId()).toBe(focus.cellDomId(1, 'name'));

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('PageDown memindahkan sebesar tinggi viewport', () => {
    const { container, grid, renderer, focus, press, focusedId } = setup();
    press('ArrowDown', grid.element);

    press('PageDown', document.activeElement as HTMLElement);
    const page = Math.max(
      1,
      Math.floor(grid.viewportElement.clientHeight / 40) - 1,
    );
    expect(focusedId()).toBe(focus.cellDomId(1 + page, 'name'));

    press('PageUp', document.activeElement as HTMLElement);
    expect(focusedId()).toBe(focus.cellDomId(1, 'name'));

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('roving tabindex hanya aktif pada sel fokus', () => {
    const { container, grid, renderer, press } = setup();
    press('ArrowDown', grid.element);
    press('ArrowRight', document.activeElement as HTMLElement);

    const zeros = grid.rowsElement.querySelectorAll(
      '.sui-grid__cell[tabindex="0"]',
    );
    expect(zeros).toHaveLength(1);
    expect(zeros[0]).toBe(document.activeElement);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});

describe('keyboard — header dan input', () => {
  it('ArrowUp dari baris pertama pindah ke header, ArrowDown kembali', () => {
    const { container, grid, renderer, press } = setup();
    press('ArrowDown', grid.element);

    press('ArrowUp', document.activeElement as HTMLElement);
    expect((document.activeElement as HTMLElement).tagName).toBe('BUTTON');

    press('ArrowDown', document.activeElement as HTMLElement);
    expect(
      (document.activeElement as HTMLElement).classList.contains(
        'sui-grid__cell',
      ),
    ).toBe(true);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('keyboard di input filter tidak diambil alih', () => {
    const { container, grid, renderer, press } = setup({ filterRow: true });
    const input = grid.filterRow?.element.querySelector(
      'input',
    ) as HTMLInputElement;
    input.focus();

    const event = press('ArrowLeft', input);
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(input);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('Tab tidak dicegah', () => {
    const { container, grid, renderer, press } = setup();
    press('ArrowDown', grid.element);

    const event = press('Tab', document.activeElement as HTMLElement);
    expect(event.defaultPrevented).toBe(false);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
