import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';

interface Row {
  id: number;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'id', caption: 'ID', width: 80 },
]);

function setup(
  options: Partial<Parameters<typeof createGridView<Row>>[0]> = {},
) {
  const onPageChange = vi.fn();
  const container = document.createElement('div');
  container.style.width = '600px';
  container.style.height = '300px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: 20,
    pager: true,
    pageIndex: 0,
    pageSize: 20,
    totalCount: 45,
    onPageChange,
    ...options,
  });
  const pager = (): HTMLElement => grid.pager?.element as HTMLElement;
  const status = (): string =>
    (pager().querySelector('.sui-grid__pager-status') as HTMLElement)
      .textContent ?? '';
  const buttons = (): HTMLButtonElement[] => [
    ...pager().querySelectorAll<HTMLButtonElement>('.sui-grid__pager-button'),
  ];
  return { container, grid, onPageChange, pager, status, buttons };
}

describe('pager — total diketahui', () => {
  it('menampilkan halaman, total, dan status tombol', () => {
    const { container, grid, pager, status, buttons } = setup();

    expect(pager()).not.toBeNull();
    expect(pager().getAttribute('role')).toBe('navigation');
    expect(status()).toBe('Halaman 1 dari 3 • 45 data');
    expect(buttons()[0]?.disabled).toBe(true);
    expect(buttons()[1]?.disabled).toBe(false);
    expect(buttons()[0]?.getAttribute('aria-label')).toBe('Halaman sebelumnya');

    grid.dispose();
    container.remove();
  });

  it('next memanggil onPageChange dan setPaging memperbarui UI', () => {
    const { container, grid, onPageChange, status, buttons } = setup();

    buttons()[1]?.click();
    expect(onPageChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 20 });

    grid.setPaging({ pageIndex: 2, pageSize: 20, totalCount: 45 });
    expect(status()).toBe('Halaman 3 dari 3 • 45 data');
    expect(buttons()[1]?.disabled).toBe(true);
    expect(buttons()[0]?.disabled).toBe(false);

    grid.dispose();
    container.remove();
  });

  it('mengubah ukuran halaman mereset ke halaman 1', () => {
    const { container, grid, onPageChange, status } = setup();
    const select = document.querySelector(
      '.sui-grid__pager-size select',
    ) as HTMLSelectElement;

    select.value = '50';
    select.dispatchEvent(new Event('change'));

    expect(onPageChange).toHaveBeenCalledWith({ pageIndex: 0, pageSize: 50 });
    grid.setPaging({ pageIndex: 0, pageSize: 50, totalCount: 45 });
    expect(status()).toBe('Halaman 1 dari 1 • 45 data');

    grid.dispose();
    container.remove();
  });
});

describe('pager — total tidak diketahui', () => {
  it('memakai itemCount dan mengizinkan next pada halaman penuh', () => {
    const { container, grid, onPageChange, status, buttons } = setup({
      totalCount: null,
      itemCount: 20,
    });

    expect(status()).toBe('Halaman 1 • 20 dimuat');
    expect(buttons()[1]?.disabled).toBe(false);

    buttons()[1]?.click();
    expect(onPageChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 20 });

    grid.setPaging({
      pageIndex: 1,
      pageSize: 20,
      totalCount: null,
      itemCount: 5,
    });
    expect(status()).toBe('Halaman 2 • 5 dimuat');
    expect(buttons()[1]?.disabled).toBe(true);

    grid.dispose();
    container.remove();
  });

  it('pager nonaktif menyembunyikan footer', () => {
    const { container, grid } = setup({ pager: false });
    expect(grid.pager).toBeUndefined();
    expect(grid.footerElement.hidden).toBe(true);
    grid.dispose();
    container.remove();
  });
});
