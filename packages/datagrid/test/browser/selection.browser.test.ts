import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
  name: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 160 },
]);

const ROWS: Row[] = [
  { id: 1, name: 'A' },
  { id: 2, name: 'B' },
  { id: 3, name: 'C' },
];

function setup(mode: 'single' | 'multiple' = 'multiple') {
  const onSelectionChange = vi.fn();
  const container = document.createElement('div');
  container.style.width = '500px';
  container.style.height = '300px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: ROWS.length,
    selectionMode: mode,
    rowKey: (row) => row.id,
    getVisibleKeys: () => ROWS.map((row) => row.id),
    onSelectionChange,
  });
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns: [grid.selectionColumn as never, ...COLUMNS],
    rows: ROWS,
    keyOf: (row) => row.id,
  });
  const headerCheckbox = (): HTMLInputElement | null =>
    grid.headerElement.querySelector('input[type="checkbox"]');
  const rowCheckboxes = (): HTMLInputElement[] => [
    ...grid.rowsElement.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    ),
  ];
  return {
    container,
    grid,
    renderer,
    onSelectionChange,
    headerCheckbox,
    rowCheckboxes,
  };
}

describe('selection — header select all', () => {
  it('memilih semua baris dan menampilkan indeterminate', () => {
    const { container, grid, renderer, onSelectionChange, headerCheckbox } =
      setup();

    const checkbox = headerCheckbox();
    expect(checkbox?.getAttribute('aria-label')).toBe('Pilih semua baris');

    checkbox?.click();
    expect(onSelectionChange).toHaveBeenLastCalledWith([1, 2, 3]);

    grid.setSelection([1]);
    expect(headerCheckbox()?.indeterminate).toBe(true);
    expect(headerCheckbox()?.checked).toBe(false);

    grid.setSelection([1, 2, 3]);
    expect(headerCheckbox()?.checked).toBe(true);
    headerCheckbox()?.click();
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('mode single tidak menampilkan select-all', () => {
    const { container, grid, renderer, headerCheckbox } = setup('single');
    expect(headerCheckbox()).toBeNull();
    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});

describe('selection — checkbox baris', () => {
  it('klik dan shift-klik memilih serta membuat range', () => {
    const { container, grid, renderer, onSelectionChange, rowCheckboxes } =
      setup();

    expect(rowCheckboxes()[0]?.getAttribute('aria-label')).toBe('Pilih baris');
    rowCheckboxes()[0]?.click();
    expect(onSelectionChange).toHaveBeenLastCalledWith([1]);

    rowCheckboxes()[2]?.dispatchEvent(
      new MouseEvent('click', { shiftKey: true }),
    );
    expect(onSelectionChange).toHaveBeenLastCalledWith([1, 2, 3]);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('setSelection memperbarui checkbox setelah repaint', () => {
    const { container, grid, renderer, rowCheckboxes } = setup();

    grid.setSelection([2]);
    renderer.setRows(ROWS);

    expect(rowCheckboxes().map((checkbox) => checkbox.checked)).toEqual([
      false,
      true,
      false,
    ]);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('mode single memilih satu dan toggle-off', () => {
    const { container, grid, renderer, onSelectionChange, rowCheckboxes } =
      setup('single');

    rowCheckboxes()[1]?.click();
    expect(onSelectionChange).toHaveBeenLastCalledWith([2]);
    rowCheckboxes()[1]?.click();
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
