import { describe, expect, it, vi } from 'vitest';
import '../../../datagrid/src/styles/grid.css';
import {
  createDataGrid,
  getDataGridInstance,
  registerJQueryPlugin,
  type VanillaDataGridOptions,
} from '../../src/index.js';

interface Row {
  id: number;
  name: string;
  total: number;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ani', total: 10 },
  { id: 2, name: 'Budi', total: 20 },
];

const COLUMNS = [
  { dataField: 'name' as const, caption: 'Nama', width: 120 },
  { dataField: 'total' as const, caption: 'Total', width: 100 },
];

function createHost(): HTMLElement {
  const host = document.createElement('div');
  host.style.width = '600px';
  host.style.height = '300px';
  document.body.append(host);
  return host;
}

function cells(host: HTMLElement): string[][] {
  return [...host.querySelectorAll<HTMLElement>('[role="row"]')]
    .filter((row) => row.querySelector('[role="gridcell"]'))
    .slice(0, 2)
    .map((row) =>
      [...row.querySelectorAll<HTMLElement>('[role="gridcell"]')].map(
        (cell) => cell.textContent ?? '',
      ),
    );
}

function header(host: HTMLElement, caption: string): HTMLElement | undefined {
  return [...host.querySelectorAll<HTMLElement>('[role="columnheader"]')].find(
    (cell) => cell.textContent?.includes(caption),
  );
}

function baseOptions(
  extra: Partial<VanillaDataGridOptions> = {},
): VanillaDataGridOptions {
  return { columns: COLUMNS, rows: ROWS, keyExpr: 'id', ...extra };
}

describe('vanilla DataGrid', () => {
  it('merender grid, update rows, dan destroy', () => {
    const host = createHost();
    const grid = createDataGrid(host, baseOptions());

    expect(host.querySelectorAll('[role="grid"]')).toHaveLength(1);
    expect(cells(host)[0]).toEqual(['Ani', '10']);

    grid.update(baseOptions({ rows: [{ id: 3, name: 'Cici', total: 30 }] }));
    expect(cells(host)[0]).toEqual(['Cici', '30']);

    grid.destroy();
    expect(host.querySelector('[role="grid"]')).toBeNull();
    host.remove();
  });

  it('sort controlled kembali ke opsi bila callback tidak mengubah', () => {
    const host = createHost();
    const onSortChange = vi.fn();
    const grid = createDataGrid(
      host,
      baseOptions({ sortBy: [], onSortChange }),
    );

    header(host, 'Nama')?.querySelector('button')?.click();

    expect(onSortChange).toHaveBeenCalledWith([
      { selector: 'name', desc: false },
    ]);
    expect(header(host, 'Nama')?.getAttribute('aria-sort')).toBe('none');

    grid.destroy();
    host.remove();
  });

  it('selection controlled kembali ke opsi dan page menunggu opsi', () => {
    const host = createHost();
    const onSelectionChange = vi.fn();
    const onPageChange = vi.fn();
    const grid = createDataGrid(
      host,
      baseOptions({
        selectionMode: 'multiple',
        selectedKeys: [],
        onSelectionChange,
        pageIndex: 0,
        pageSize: 10,
        totalCount: 50,
        onPageChange,
      }),
    );

    const checkbox = host.querySelector(
      '[role="gridcell"] input[type="checkbox"]',
    ) as HTMLInputElement;
    checkbox.click();
    expect(onSelectionChange).toHaveBeenCalledWith([1]);
    expect(checkbox.checked).toBe(false);

    const next = host.querySelector(
      '[aria-label="Halaman berikutnya"]',
    ) as HTMLButtonElement;
    next.click();
    expect(onPageChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 });
    expect(host.querySelector('.sui-grid__pager-status')?.textContent).toBe(
      'Halaman 1 dari 5 • 50 data',
    );

    grid.destroy();
    host.remove();
  });
});

describe('jQuery bridge opsional', () => {
  it('mendaftarkan plugin dan memakai instance per elemen', () => {
    const jquery = { fn: {} as Record<string, unknown> };
    expect(registerJQueryPlugin(jquery)).toBe(true);
    const plugin = jquery.fn['simpleuiDataGrid'] as (
      this: { 0: HTMLElement },
      options: VanillaDataGridOptions,
    ) => unknown;

    const host = createHost();
    const receiver = { 0: host, length: 1 };
    expect(plugin.call(receiver, baseOptions())).toBe(receiver);
    expect(cells(host)[0]).toEqual(['Ani', '10']);

    plugin.call(
      receiver,
      baseOptions({ rows: [{ id: 4, name: 'Dedi', total: 40 }] }),
    );
    expect(cells(host)[0]).toEqual(['Dedi', '40']);

    const instance = getDataGridInstance(host);
    expect(instance).toBeDefined();
    instance?.destroy();
    expect(host.querySelector('[role="grid"]')).toBeNull();

    host.remove();
  });

  it('mengembalikan false tanpa jQuery', () => {
    expect(registerJQueryPlugin()).toBe(false);
  });
});

describe('vanilla adapter — search callback', () => {
  it('meneruskan onSearchChange dari search panel', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const calls: string[] = [];
    const grid = createDataGrid(host, {
      columns: [{ dataField: 'name', caption: 'Nama' }],
      rows: [
        { id: 1, name: 'Ani' },
        { id: 2, name: 'Budi' },
      ],
      keyExpr: 'id',
      onSearchChange: (query) => calls.push(query),
      viewOptions: { searchPanel: true, searchDebounceMs: 0 },
    });

    const input = host.querySelector<HTMLInputElement>(
      '.sui-grid__search-input',
    );
    if (!input) throw new Error('input pencarian tidak ditemukan');
    input.value = 'ani';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(calls.at(-1)).toBe('ani');
    grid.destroy();
    host.remove();
  });
});
