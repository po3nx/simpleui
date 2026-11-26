import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';

interface Row {
  id: number;
  name: string;
  total: number;
  secret: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 160 },
  { dataField: 'total', caption: 'Total', width: 120, dataType: 'number' },
  { dataField: 'secret', caption: 'Rahasia', visible: false },
]);

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function setup(
  options: Partial<Parameters<typeof createGridView<Row>>[0]> = {},
) {
  const onSearchChange = vi.fn();
  const container = document.createElement('div');
  container.style.width = '600px';
  container.style.height = '300px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: 5,
    searchPanel: true,
    searchDebounceMs: 20,
    onSearchChange,
    ...options,
  });
  const input = (): HTMLInputElement =>
    grid.searchPanel?.element.querySelector('input') as HTMLInputElement;
  const clear = (): HTMLButtonElement =>
    grid.searchPanel?.element.querySelector(
      '.sui-grid__search-clear',
    ) as HTMLButtonElement;
  return { container, grid, input, clear, onSearchChange };
}

describe('search panel — struktur', () => {
  it('menampilkan panel pencarian dengan scope kolom default', async () => {
    const { container, grid, input, clear, onSearchChange } = setup();

    expect(grid.searchPanel).toBeDefined();
    expect(grid.searchPanel?.element.getAttribute('role')).toBe('search');
    expect(grid.host.querySelector('.sui-grid__search')).not.toBeNull();
    expect(input().getAttribute('aria-label')).toBe('Cari data');
    expect(input().placeholder).toBe('Cari…');
    expect(clear().hidden).toBe(true);

    input().value = 'ani';
    input().dispatchEvent(new Event('input'));
    await wait(50);
    expect(onSearchChange).toHaveBeenCalledWith('ani', ['name', 'total']);

    grid.dispose();
    container.remove();
  });

  it('placeholder dapat dioverride', () => {
    const { container, grid, input } = setup({
      messages: { searchPlaceholder: 'Cari nama…' },
    });
    expect(input().placeholder).toBe('Cari nama…');
    grid.dispose();
    container.remove();
  });

  it('tidak dibuat bila searchPanel false', () => {
    const { container, grid } = setup({ searchPanel: false });
    expect(grid.searchPanel).toBeUndefined();
    grid.dispose();
    container.remove();
  });
});

describe('search panel — debounce dan scope', () => {
  it('menggabungkan input cepat menjadi satu panggilan', async () => {
    const { container, grid, input, onSearchChange } = setup();

    input().value = 'a';
    input().dispatchEvent(new Event('input'));
    input().value = 'an';
    input().dispatchEvent(new Event('input'));
    expect(onSearchChange).not.toHaveBeenCalled();

    await wait(60);
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('an', ['name', 'total']);

    grid.dispose();
    container.remove();
  });

  it('memakai searchFields eksplisit', async () => {
    const { container, grid, input, onSearchChange } = setup({
      searchFields: ['name'],
    });

    input().value = 'budi';
    input().dispatchEvent(new Event('input'));
    await wait(60);

    expect(onSearchChange).toHaveBeenCalledWith('budi', ['name']);
    grid.dispose();
    container.remove();
  });
});

describe('search panel — bersihkan', () => {
  it('tombol clear mengosongkan dan mengirim string kosong', async () => {
    const { container, grid, input, clear, onSearchChange } = setup();

    input().value = 'ani';
    input().dispatchEvent(new Event('input'));
    await wait(60);
    expect(clear().hidden).toBe(false);

    clear().click();
    expect(input().value).toBe('');
    expect(clear().hidden).toBe(true);
    expect(onSearchChange).toHaveBeenLastCalledWith('', ['name', 'total']);

    grid.dispose();
    container.remove();
  });

  it('Escape mengosongkan pencarian', () => {
    const { container, grid, input, onSearchChange } = setup();

    input().value = 'ani';
    input().dispatchEvent(new Event('input'));
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(input().value).toBe('');
    expect(onSearchChange).toHaveBeenCalledWith('', ['name', 'total']);

    grid.dispose();
    container.remove();
  });
});
