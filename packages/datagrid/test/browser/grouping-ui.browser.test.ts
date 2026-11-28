import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
  city: string;
  name: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'city', caption: 'Kota', width: 140 },
  { dataField: 'name', caption: 'Nama', width: 140 },
]);
const ROWS: Row[] = [
  { id: 1, city: 'Jakarta', name: 'Ani' },
  { id: 2, city: 'Jakarta', name: 'Budi' },
  { id: 3, city: 'Bandung', name: 'Citra' },
  { id: 4, city: 'Bandung', name: 'Dewi' },
];

function setup(expanded: readonly string[] = []) {
  const container = document.createElement('div');
  container.style.width = '600px';
  container.style.height = '400px';
  document.body.append(container);
  const onGroupToggle = vi.fn();
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
    groupBy: ['city'],
    expandedGroups: expanded,
    onGroupToggle,
  });
  const groups = (): HTMLElement[] => [
    ...grid.rowsElement.querySelectorAll<HTMLElement>('.sui-grid__row--group'),
  ];
  const dataRows = (): HTMLElement[] => [
    ...grid.rowsElement.querySelectorAll<HTMLElement>(
      '.sui-grid__row:not(.sui-grid__row--group):not([hidden])',
    ),
  ];
  return { container, grid, renderer, groups, dataRows, onGroupToggle };
}

describe('grouping UI — group row', () => {
  it('merender grup collapsed dengan label dan jumlah', () => {
    const { container, grid, renderer, groups, dataRows } = setup();
    expect(groups()).toHaveLength(2);
    expect(dataRows()).toHaveLength(0);
    expect(groups()[0]?.textContent).toContain('Kota: Jakarta (2)');
    expect(groups()[0]?.getAttribute('aria-expanded')).toBe('false');

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('toggle expand menampilkan baris data dan mengirim callback', () => {
    const { container, grid, renderer, groups, dataRows, onGroupToggle } =
      setup();
    groups()[0]
      ?.querySelector<HTMLButtonElement>('.sui-grid__group-toggle')
      ?.click();

    expect(onGroupToggle).toHaveBeenCalledWith(expect.any(String), true);
    expect(dataRows()).toHaveLength(2);
    expect(groups()[0]?.getAttribute('aria-expanded')).toBe('true');
    expect(
      groups()[0]?.querySelector('.sui-grid__group-toggle')?.textContent,
    ).toBe('▾');

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('setGrouping dapat membuka grup tertentu', () => {
    const { container, grid, renderer, groups, dataRows } = setup();
    const key = groups()[0]?.getAttribute('data-group-key');
    if (!key) throw new Error('group key tidak ada');
    renderer.setGrouping(['city'], [key]);
    expect(dataRows()).toHaveLength(2);
    expect(groups()[0]?.getAttribute('aria-expanded')).toBe('true');

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('tanpa groupBy semua baris data tampil', () => {
    const { container, grid, renderer } = setup();
    renderer.setGrouping([], []);
    const rows = [
      ...grid.rowsElement.querySelectorAll<HTMLElement>(
        '.sui-grid__row:not([hidden])',
      ),
    ];
    expect(
      rows.every((row) => !row.classList.contains('sui-grid__row--group')),
    ).toBe(true);
    expect(rows).toHaveLength(4);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
