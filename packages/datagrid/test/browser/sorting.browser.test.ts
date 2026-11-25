import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';

interface Row {
  id: number;
  name: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'id', caption: 'ID', width: 80 },
  { dataField: 'name', caption: 'Nama', width: 160 },
]);

function setup(onSortChange?: (sortBy: readonly unknown[]) => void) {
  const container = document.createElement('div');
  container.style.width = '600px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: 5,
    onSortChange: onSortChange as never,
  });
  const headers = (): HTMLElement[] => [
    ...grid.headerElement.querySelectorAll<HTMLElement>(
      '[role="columnheader"]',
    ),
  ];
  const buttons = (): HTMLButtonElement[] =>
    headers().map((cell) => cell.querySelector('button') as HTMLButtonElement);
  return { container, grid, headers, buttons };
}

describe('sorting UX — siklus dan multi', () => {
  it('klik mengumumkan sort tunggal', () => {
    const onSort = vi.fn();
    const { container, grid, buttons, headers } = setup(onSort);

    buttons()[1]?.click();

    expect(onSort).toHaveBeenLastCalledWith([
      { selector: 'name', desc: false },
    ]);
    expect(headers()[1]?.getAttribute('aria-sort')).toBe('ascending');
    expect(grid.liveElement.textContent).toBe(
      'Diurutkan berdasarkan Nama menaik.',
    );

    grid.dispose();
    container.remove();
  });

  it('Shift+klik mengumumkan jumlah kolom', () => {
    const onSort = vi.fn();
    const { container, grid, buttons } = setup(onSort);

    buttons()[0]?.click();
    buttons()[1]?.dispatchEvent(new MouseEvent('click', { shiftKey: true }));

    expect(onSort).toHaveBeenLastCalledWith([
      { selector: 'id', desc: false },
      { selector: 'name', desc: false },
    ]);
    expect(grid.liveElement.textContent).toContain('2 kolom');

    grid.dispose();
    container.remove();
  });

  it('Shift+Enter menambah descriptor lewat keyboard', () => {
    const onSort = vi.fn();
    const { container, grid, buttons } = setup(onSort);

    buttons()[0]?.click();
    buttons()[1]?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true,
        bubbles: true,
      }),
    );

    expect(onSort).toHaveBeenLastCalledWith([
      { selector: 'id', desc: false },
      { selector: 'name', desc: false },
    ]);

    grid.dispose();
    container.remove();
  });
});

describe('sorting UX — reset', () => {
  it('Ctrl+klik menghapus semua sort dan mengumumkannya', () => {
    const onSort = vi.fn();
    const { container, grid, buttons, headers } = setup(onSort);

    buttons()[0]?.click();
    buttons()[1]?.dispatchEvent(new MouseEvent('click', { shiftKey: true }));
    buttons()[1]?.dispatchEvent(new MouseEvent('click', { ctrlKey: true }));

    expect(onSort).toHaveBeenLastCalledWith([]);
    expect(
      headers().every((cell) => cell.getAttribute('aria-sort') === 'none'),
    ).toBe(true);
    expect(grid.liveElement.textContent).toBe('Pengurutan dihapus.');

    grid.dispose();
    container.remove();
  });

  it('clearSorting() mereset sort aktif', () => {
    const onSort = vi.fn();
    const { container, grid, buttons, headers } = setup(onSort);

    buttons()[0]?.click();
    grid.clearSorting();

    expect(onSort).toHaveBeenLastCalledWith([]);
    expect(headers()[0]?.getAttribute('aria-sort')).toBe('none');
    expect(headers()[0]?.querySelector('.sui-grid__sort-indicator')).toBeNull();

    grid.dispose();
    container.remove();
  });

  it('descriptor dibuang saat kolomnya tidak lagi tersedia', () => {
    const { container, grid, headers } = setup();
    grid.setSorting([{ selector: 'name', desc: false }]);
    expect(headers()[1]?.getAttribute('aria-sort')).toBe('ascending');

    grid.setColumns(
      normalizeColumnModel<Row>([{ dataField: 'id', caption: 'ID' }]),
    );

    expect(headers()).toHaveLength(1);
    expect(headers()[0]?.getAttribute('aria-sort')).toBe('none');

    grid.dispose();
    container.remove();
  });
});
