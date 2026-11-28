import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';
import type { EditingUiOptions } from '../../src/view/cell-editor.js';

interface Row {
  id: number;
  name: string;
  total: number;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 140 },
  { dataField: 'total', caption: 'Total', width: 100, dataType: 'number' },
]);
const ROWS: Row[] = [{ id: 1, name: 'Ani', total: 10 }];

function setup(editing: EditingUiOptions<Row>) {
  const container = document.createElement('div');
  container.style.width = '500px';
  container.style.height = '200px';
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
    editing,
  });
  const cell = (columnId: string): HTMLElement =>
    grid.rowsElement.querySelector<HTMLElement>(
      `[data-column-id="${columnId}"]`,
    ) as HTMLElement;
  return { container, grid, renderer, cell };
}

describe('editing UI — cell mode', () => {
  it('dblclick membuka editor dan Enter mengirim commit', () => {
    const onCommit = vi.fn();
    const { container, grid, renderer, cell } = setup({
      mode: 'cell',
      onCommit,
    });

    cell('name').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input =
      cell('name').querySelector<HTMLInputElement>('.sui-grid__editor');
    expect(input).not.toBeNull();
    if (!input) throw new Error('editor tidak muncul');
    input.value = 'Ani Baru';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );

    expect(onCommit).toHaveBeenCalledWith(1, { name: 'Ani Baru' }, ROWS[0]);
    expect(cell('name').querySelector('.sui-grid__editor')).toBeNull();

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('Escape mengembalikan teks dan mengirim cancel', () => {
    const onCancel = vi.fn();
    const { container, grid, renderer, cell } = setup({
      mode: 'cell',
      onCancel,
    });
    cell('name').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input =
      cell('name').querySelector<HTMLInputElement>('.sui-grid__editor');
    if (!input) throw new Error('editor tidak muncul');
    input.value = 'Batal';
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    expect(onCancel).toHaveBeenCalledWith(1);
    expect(cell('name').textContent).toBe('Ani');

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('commitOnBlur menyimpan saat fokus keluar', () => {
    const onCommit = vi.fn();
    const { container, grid, renderer, cell } = setup({
      mode: 'cell',
      commitOnBlur: true,
      onCommit,
    });
    cell('total').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const input =
      cell('total').querySelector<HTMLInputElement>('.sui-grid__editor');
    if (!input) throw new Error('editor tidak muncul');
    input.value = '25';
    input.blur();

    expect(onCommit).toHaveBeenCalledWith(1, { total: 25 }, ROWS[0]);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('onStart=false mencegah editor', () => {
    const { container, grid, renderer, cell } = setup({
      mode: 'cell',
      onStart: () => false,
    });
    cell('name').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(cell('name').querySelector('.sui-grid__editor')).toBeNull();
    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});

describe('editing UI — row mode', () => {
  it('membuka input untuk semua kolom editable dan commit bersamaan', () => {
    const onCommit = vi.fn();
    const { container, grid, renderer, cell } = setup({
      mode: 'row',
      onCommit,
    });
    cell('name').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const inputs = [
      ...grid.rowsElement.querySelectorAll<HTMLInputElement>(
        '.sui-grid__editor',
      ),
    ];
    expect(inputs).toHaveLength(2);

    const nameInput = inputs[0];
    const totalInput = inputs[1];
    if (!nameInput || !totalInput) throw new Error('input tidak lengkap');
    nameInput.value = 'Ani Baru';
    totalInput.value = '55';
    nameInput.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(onCommit).toHaveBeenCalledWith(
      1,
      {
        name: 'Ani Baru',
        total: 55,
      },
      ROWS[0],
    );

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
