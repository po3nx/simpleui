import { ArrayStore } from '@simpleui/core';
import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
  city: number;
}

const LOOKUP_ROWS: Record<string, unknown>[] = [
  { id: 1, label: 'Jakarta' },
  { id: 2, label: 'Bandung' },
];
const ROWS: Row[] = [{ id: 10, city: 1 }];

function setup() {
  const lookupStore = new ArrayStore<Record<string, unknown>>(LOOKUP_ROWS, {
    key: 'id',
  });
  const load = vi.spyOn(lookupStore, 'load');
  const columns = normalizeColumnModel<Row>([
    {
      dataField: 'city',
      caption: 'Kota',
      width: 160,
      lookup: {
        store: lookupStore,
        valueExpr: 'id',
        textExpr: 'label',
        searchEnabled: true,
        debounceMs: 0,
      },
    },
  ]);
  const container = document.createElement('div');
  container.style.width = '500px';
  container.style.height = '200px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns,
    rowCount: ROWS.length,
    rowHeight: 40,
  });
  const onCommit = vi.fn();
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns,
    rows: ROWS,
    keyOf: (row) => row.id,
    editing: { mode: 'cell', onCommit },
  });
  const cell = (): HTMLElement =>
    grid.rowsElement.querySelector<HTMLElement>(
      '[data-column-id="city"]',
    ) as HTMLElement;
  return { lookupStore, load, grid, renderer, cell, onCommit, container };
}

describe('lookup — display', () => {
  it('memuat label dari store dan menampilkannya di sel', async () => {
    const { load, grid, renderer, cell, container } = setup();
    await expect.poll(() => cell()?.textContent).toBe('Jakarta');
    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: ['id', 'in', [1]],
      }),
    );
    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});

describe('lookup — editor', () => {
  it('remote search lalu memilih nilai label', async () => {
    const { grid, renderer, cell, onCommit, container } = setup();
    await expect.poll(() => cell()?.textContent).toBe('Jakarta');
    cell().dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    const input = cell().querySelector<HTMLInputElement>(
      '.sui-grid__editor--lookup',
    );
    if (!input) throw new Error('editor lookup tidak muncul');
    await expect.poll(() => input.value).toBe('Jakarta');

    input.value = 'Bandung';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await expect
      .poll(
        () => cell().querySelector<HTMLOptionElement>('datalist option')?.value,
      )
      .toBe('Bandung');

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(onCommit).toHaveBeenCalledWith(10, { city: 2 }, ROWS[0]);
    expect(cell().textContent).toBe('Bandung');

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('Escape membatalkan tanpa mengubah nilai', async () => {
    const onCommit = vi.fn();
    const store = new ArrayStore<Record<string, unknown>>(LOOKUP_ROWS, {
      key: 'id',
    });
    const columns = normalizeColumnModel<Row>([
      {
        dataField: 'city',
        caption: 'Kota',
        width: 160,
        lookup: { store, valueExpr: 'id', textExpr: 'label' },
      },
    ]);
    const container = document.createElement('div');
    container.style.width = '500px';
    container.style.height = '200px';
    document.body.append(container);
    const grid = createGridView<Row>({
      container,
      columns,
      rowCount: 1,
      rowHeight: 40,
    });
    const renderer = createRowRenderer<Row>({
      gridElement: grid.element,
      viewportElement: grid.viewportElement,
      spacerElement: grid.spacerElement,
      rowsElement: grid.rowsElement,
      columns,
      rows: ROWS,
      keyOf: (row) => row.id,
      editing: { mode: 'cell', onCommit },
    });
    const cell = grid.rowsElement.querySelector<HTMLElement>(
      '[data-column-id="city"]',
    );
    await expect.poll(() => cell?.textContent).toBe('Jakarta');
    cell?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input = cell?.querySelector<HTMLInputElement>(
      '.sui-grid__editor--lookup',
    );
    if (!input) throw new Error('editor lookup tidak muncul');
    input.value = 'Bandung';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(onCommit).not.toHaveBeenCalled();
    expect(cell?.textContent).toBe('Jakarta');

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
