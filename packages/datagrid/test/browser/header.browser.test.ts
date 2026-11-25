import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';

interface Row {
  id: number;
  name: string;
  locked: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'id', caption: 'ID', width: 80 },
  { dataField: 'name', caption: 'Nama', width: 160 },
  { dataField: 'locked', caption: 'Terkunci', allowSorting: false },
]);

function mount(onSortChange?: (sortBy: unknown) => void) {
  const container = document.createElement('div');
  container.style.height = '300px';
  document.body.append(container);
  const view = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: 10,
    onSortChange: onSortChange as never,
  });
  const headers = (): HTMLElement[] => [
    ...view.headerElement.querySelectorAll<HTMLElement>(
      '[role="columnheader"]',
    ),
  ];
  const sortButton = (index: number): HTMLButtonElement =>
    headers()[index]?.querySelector('button') as HTMLButtonElement;
  return { container, view, headers, sortButton };
}

describe('header — aria-sort dan indikator', () => {
  it('memberi aria-sort none untuk kolom sortable, tanpa attr untuk yang tidak', () => {
    const { headers, view } = mount();
    const [id, name, locked] = headers();

    expect(id?.getAttribute('aria-sort')).toBe('none');
    expect(name?.getAttribute('aria-sort')).toBe('none');
    expect(locked?.hasAttribute('aria-sort')).toBe(false);
    expect(locked?.querySelector('.sui-grid__header-button')).toBeNull();
    view.dispose();
  });

  it('klik header melakukan siklus asc → desc → none', () => {
    const onSortChange = vi.fn();
    const { sortButton, headers, view } = mount(onSortChange);

    sortButton(0).click();
    expect(onSortChange).toHaveBeenLastCalledWith([
      { selector: 'id', desc: false },
    ]);
    expect(headers()[0]?.getAttribute('aria-sort')).toBe('ascending');
    expect(
      headers()[0]?.querySelector('.sui-grid__sort-indicator')?.textContent,
    ).toBe('▲');

    sortButton(0).click();
    expect(onSortChange).toHaveBeenLastCalledWith([
      { selector: 'id', desc: true },
    ]);
    expect(headers()[0]?.getAttribute('aria-sort')).toBe('descending');
    expect(
      headers()[0]?.querySelector('.sui-grid__sort-indicator')?.textContent,
    ).toBe('▼');

    sortButton(0).click();
    expect(onSortChange).toHaveBeenLastCalledWith([]);
    expect(headers()[0]?.getAttribute('aria-sort')).toBe('none');
    expect(headers()[0]?.querySelector('.sui-grid__sort-indicator')).toBeNull();

    view.dispose();
  });

  it('shift+klik menambah descriptor dengan urutan multi-sort', () => {
    const onSortChange = vi.fn();
    const { sortButton, headers, view } = mount(onSortChange);

    sortButton(0).click();
    sortButton(1).dispatchEvent(new MouseEvent('click', { shiftKey: true }));

    expect(onSortChange).toHaveBeenLastCalledWith([
      { selector: 'id', desc: false },
      { selector: 'name', desc: false },
    ]);
    expect(
      headers()[1]?.querySelector('.sui-grid__sort-order')?.textContent,
    ).toBe('2');
    view.dispose();
  });

  it('setSorting memperbarui aria dan indikator', () => {
    const { view, headers } = mount();
    view.setSorting([{ selector: 'name', desc: true }]);

    expect(headers()[1]?.getAttribute('aria-sort')).toBe('descending');
    expect(
      headers()[1]?.querySelector('.sui-grid__sort-indicator')?.textContent,
    ).toBe('▼');
    view.dispose();
  });

  it('setColumns mempertahankan sortBy aktif', () => {
    const { view, headers } = mount();
    view.setSorting([{ selector: 'id', desc: false }]);
    view.setColumns(COLUMNS);

    expect(headers()[0]?.getAttribute('aria-sort')).toBe('ascending');
    view.dispose();
  });
});

describe('header — filter dan aksesibilitas', () => {
  it('menampilkan penanda filter aktif', () => {
    const { view, headers } = mount();
    view.setFilteredColumns(['name']);

    const marker = headers()[1]?.querySelector('.sui-grid__filter-indicator');
    expect(marker).not.toBeNull();
    expect(marker?.getAttribute('aria-label')).toBe('Filter aktif');

    view.setFilteredColumns([]);
    expect(
      headers()[1]?.querySelector('.sui-grid__filter-indicator'),
    ).toBeNull();
    view.dispose();
  });

  it('menggunakan button native untuk aktivasi keyboard', () => {
    const { sortButton, view } = mount();
    const button = sortButton(0);

    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    view.dispose();
  });
});
