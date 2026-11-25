import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';

interface Row {
  name: string;
  locked: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 160 },
  {
    dataField: 'locked',
    caption: 'Terkunci',
    width: 120,
    allowFiltering: false,
  },
]);

function setup(unique: readonly unknown[] = ['B', 'A', null, 'A']) {
  const onFilterChange = vi.fn();
  const getUniqueValues = vi.fn(() => unique);
  const container = document.createElement('div');
  container.style.width = '600px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: 5,
    getUniqueValues,
    onFilterChange,
  });
  const header = (columnId: string): HTMLElement =>
    grid.headerElement.querySelector(
      `[data-column-id="${columnId}"]`,
    ) as HTMLElement;
  const trigger = (): HTMLButtonElement =>
    header('name').querySelector(
      '.sui-grid__header-filter',
    ) as HTMLButtonElement;
  const panel = (): HTMLElement | null =>
    document.querySelector('.sui-grid__filter-panel');
  const options = (): HTMLElement[] => [
    ...(panel()?.querySelectorAll('.sui-grid__filter-option') ?? []),
  ];
  return {
    container,
    grid,
    onFilterChange,
    getUniqueValues,
    header,
    trigger,
    panel,
    options,
  };
}

function cleanup(
  grid: ReturnType<typeof createGridView<Row>>,
  container: HTMLElement,
) {
  grid.dispose();
  container.remove();
  document.querySelector('.sui-grid__filter-panel')?.remove();
}

describe('header filter — panel', () => {
  it('membuka dialog dengan nilai unik terurut dan blanks', () => {
    const { container, grid, trigger, panel, options, getUniqueValues } =
      setup();
    trigger().click();

    expect(panel()).not.toBeNull();
    expect(panel()?.getAttribute('role')).toBe('dialog');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(options().map((option) => option.textContent)).toEqual([
      'A',
      'B',
      '(Blanks)',
    ]);
    expect(document.activeElement).toBe(
      panel()?.querySelector('.sui-grid__filter-search'),
    );
    expect(getUniqueValues).toHaveBeenCalledWith('name');

    cleanup(grid, container);
  });

  it('pencarian menyaring daftar', () => {
    const { container, grid, trigger, panel } = setup();
    trigger().click();

    const search = panel()?.querySelector(
      '.sui-grid__filter-search',
    ) as HTMLInputElement;
    search.value = 'B';
    search.dispatchEvent(new Event('input'));

    const labels = [
      ...(panel()?.querySelectorAll('.sui-grid__filter-option') ?? []),
    ].map((option) => option.textContent);
    expect(labels).toEqual(['B', '(Blanks)']);

    cleanup(grid, container);
  });

  it('kolom allowFiltering=false tidak punya tombol filter', () => {
    const { container, grid, header } = setup();
    expect(
      header('locked').querySelector('.sui-grid__header-filter'),
    ).toBeNull();
    cleanup(grid, container);
  });
});

describe('header filter — apply', () => {
  function selectOption(
    panelElement: HTMLElement,
    label: string,
    checked: boolean,
  ) {
    const option = [
      ...panelElement.querySelectorAll('.sui-grid__filter-option'),
    ].find((entry) => entry.textContent === label) as HTMLElement;
    const checkbox = option.querySelector('input') as HTMLInputElement;
    checkbox.checked = checked;
    checkbox.dispatchEvent(new Event('change'));
  }

  it('nilai terpilih membentuk operator in', () => {
    const { container, grid, trigger, panel, onFilterChange } = setup();
    trigger().click();
    const panelElement = panel() as HTMLElement;

    selectOption(panelElement, 'B', false);
    (
      panelElement.querySelector('.sui-grid__filter-apply') as HTMLButtonElement
    ).click();

    expect(onFilterChange).toHaveBeenCalledWith(['name', 'in', ['A', null]]);
    expect(panel()).toBeNull();

    cleanup(grid, container);
  });

  it('hanya blanks membentuk eq null', () => {
    const { container, grid, trigger, panel, onFilterChange } = setup();
    trigger().click();
    const panelElement = panel() as HTMLElement;

    (
      panelElement.querySelector(
        '.sui-grid__filter-actions button:nth-child(2)',
      ) as HTMLButtonElement
    ).click();
    selectOption(panelElement, '(Blanks)', true);
    (
      panelElement.querySelector('.sui-grid__filter-apply') as HTMLButtonElement
    ).click();

    expect(onFilterChange).toHaveBeenCalledWith(['name', 'eq', null]);

    cleanup(grid, container);
  });

  it('pilih semua berarti tanpa filter', () => {
    const { container, grid, trigger, panel, onFilterChange } = setup();
    trigger().click();

    (
      panel()?.querySelector('.sui-grid__filter-apply') as HTMLButtonElement
    ).click();
    expect(onFilterChange).toHaveBeenCalledWith(null);

    cleanup(grid, container);
  });

  it('hapus filter mengirim null', () => {
    const { container, grid, trigger, panel, onFilterChange } = setup();
    trigger().click();

    (
      panel()?.querySelector(
        '.sui-grid__filter-footer button:last-child',
      ) as HTMLButtonElement
    ).click();
    expect(onFilterChange).toHaveBeenCalledWith(null);

    cleanup(grid, container);
  });

  it('klik di luar menutup panel', () => {
    const { container, grid, trigger, panel } = setup();
    trigger().click();
    expect(panel()).not.toBeNull();

    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    );

    expect(panel()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    cleanup(grid, container);
  });
});
