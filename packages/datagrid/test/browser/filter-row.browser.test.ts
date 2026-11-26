import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';

interface Row {
  id: number;
  name: string;
  total: number;
  active: boolean;
  secret: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 160 },
  { dataField: 'total', caption: 'Total', width: 120, dataType: 'number' },
  { dataField: 'active', caption: 'Aktif', width: 100, dataType: 'boolean' },
  { dataField: 'secret', caption: 'Rahasia', visible: false },
  { dataField: 'id', caption: 'ID', allowFiltering: false },
]);

function setup(filterValue?: unknown) {
  const onFilterChange = vi.fn();
  const container = document.createElement('div');
  container.style.width = '800px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: 5,
    filterRow: true,
    filterValue: filterValue as never,
    onFilterChange,
  });
  const row = (): HTMLElement => grid.filterRow?.element as HTMLElement;
  const inputFor = (columnId: string): HTMLInputElement | HTMLSelectElement =>
    row().querySelector(
      `[data-column-id="${columnId}"] .sui-grid__filter-input`,
    ) as HTMLInputElement | HTMLSelectElement;
  const operatorFor = (columnId: string): HTMLSelectElement =>
    row().querySelector(
      `[data-column-id="${columnId}"] .sui-grid__filter-operator`,
    ) as HTMLSelectElement;
  return { container, grid, row, inputFor, operatorFor, onFilterChange };
}

describe('filter row — struktur', () => {
  it('merender input untuk kolom terlihat yang boleh difilter', () => {
    const { container, grid, row, inputFor } = setup();

    expect(row()).not.toBeNull();
    expect(row().getAttribute('role')).toBe('row');
    expect(row().querySelectorAll('.sui-grid__filter-cell')).toHaveLength(4);
    expect(row().querySelector('[data-column-id="secret"]')).toBeNull();
    const idCell = row().querySelector('[data-column-id="id"]');
    expect(idCell?.getAttribute('aria-hidden')).toBe('true');
    expect(idCell?.querySelector('input')).toBeNull();
    expect(inputFor('name').getAttribute('aria-label')).toBe('Filter Nama');

    grid.dispose();
    container.remove();
  });

  it('operator mengikuti tipe kolom', () => {
    const { container, grid, operatorFor } = setup();

    const nameOps = [...operatorFor('name').options].map(
      (option) => option.value,
    );
    const totalOps = [...operatorFor('total').options].map(
      (option) => option.value,
    );
    expect(nameOps).toContain('contains');
    expect(totalOps).toContain('gt');
    expect(totalOps).not.toContain('contains');

    grid.dispose();
    container.remove();
  });
});

describe('filter row — commit', () => {
  it('mengirim kondisi tunggal dan gabungan AND', () => {
    const { container, grid, inputFor, operatorFor, onFilterChange } = setup();

    const name = inputFor('name');
    name.value = 'Ani';
    name.dispatchEvent(new Event('change'));
    expect(onFilterChange).toHaveBeenLastCalledWith([
      'name',
      'contains',
      'Ani',
    ]);

    operatorFor('total').value = 'gt';
    operatorFor('total').dispatchEvent(new Event('change'));
    const total = inputFor('total');
    total.value = '5';
    total.dispatchEvent(new Event('change'));

    expect(onFilterChange).toHaveBeenLastCalledWith([
      'and',
      ['name', 'contains', 'Ani'],
      ['total', 'gt', 5],
    ]);

    grid.dispose();
    container.remove();
  });

  it('Enter meng-commit dan mengosongkan input menghapus kondisi', () => {
    const { container, grid, inputFor, onFilterChange } = setup();
    const name = inputFor('name');

    name.value = 'Budi';
    name.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(onFilterChange).toHaveBeenLastCalledWith([
      'name',
      'contains',
      'Budi',
    ]);

    name.value = '';
    name.dispatchEvent(new Event('change'));
    expect(onFilterChange).toHaveBeenLastCalledWith(null);

    grid.dispose();
    container.remove();
  });

  it('nilai boolean dikonversi menjadi boolean', () => {
    const { container, grid, inputFor, onFilterChange } = setup();
    const active = inputFor('active');

    active.value = 'true';
    active.dispatchEvent(new Event('change'));
    expect(onFilterChange).toHaveBeenLastCalledWith(['active', 'eq', true]);

    grid.dispose();
    container.remove();
  });
});

describe('filter row — controlled', () => {
  it('setFilterValue mengisi input dan operator', () => {
    const { container, grid, inputFor, operatorFor } = setup();

    grid.setFilterValue(['total', 'lte', 10] as never);

    expect(inputFor('total').value).toBe('10');
    expect(operatorFor('total').value).toBe('lte');

    grid.dispose();
    container.remove();
  });
});

describe('filter row — layout', () => {
  it('bertumpuk di bawah header dan sejajar dengan kolom (termasuk selection)', () => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '300px';
    document.body.append(container);
    const grid = createGridView<Row>({
      container,
      columns: COLUMNS,
      rowCount: 2,
      filterRow: true,
      selectionMode: 'multiple',
      rowKey: (row) => row.id,
      getVisibleKeys: () => [1, 2],
    });

    const headerRow = grid.headerElement.querySelector<HTMLElement>(
      '.sui-grid__row--header',
    );
    const filterRowElement = grid.filterRow?.element as HTMLElement;
    expect(headerRow).not.toBeNull();

    const headerRect = headerRow?.getBoundingClientRect();
    const filterRect = filterRowElement.getBoundingClientRect();
    expect(filterRect.top).toBeGreaterThanOrEqual(
      (headerRect?.bottom ?? 0) - 1,
    );

    const cells = [
      ...filterRowElement.querySelectorAll<HTMLElement>(
        '.sui-grid__filter-cell',
      ),
    ];
    expect(cells[0]?.getAttribute('data-column-id')).toBe(
      '__simpleui_selection',
    );
    expect(cells[0]?.getAttribute('aria-hidden')).toBe('true');
    expect(cells[0]?.querySelector('input')).toBeNull();

    const headers = [
      ...grid.headerElement.querySelectorAll<HTMLElement>(
        '[role="columnheader"]',
      ),
    ];
    const nameHeader = headers.find(
      (cell) => cell.getAttribute('data-column-id') === 'name',
    );
    const nameFilter = cells.find(
      (cell) => cell.getAttribute('data-column-id') === 'name',
    );
    expect(
      Math.abs(
        (nameFilter?.getBoundingClientRect().left ?? 0) -
          (nameHeader?.getBoundingClientRect().left ?? 0),
      ),
    ).toBeLessThan(1);

    grid.dispose();
    container.remove();
  });
});
