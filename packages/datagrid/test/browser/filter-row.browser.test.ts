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
    expect(row().querySelectorAll('.sui-grid__filter-cell')).toHaveLength(3);
    expect(row().querySelector('[data-column-id="secret"]')).toBeNull();
    expect(row().querySelector('[data-column-id="id"]')).toBeNull();
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
