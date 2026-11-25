import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridStateStore } from '../../src/model/state.js';
import { createStatePersistence } from '../../src/data/persistence.js';
import type { StateStorage } from '../../src/api/types.js';
import { createGridView } from '../../src/view/grid-view.js';

interface Row {
  id: number;
  name: string;
  total: number;
  secret: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 120 },
  { dataField: 'total', caption: 'Total', width: 100 },
  { dataField: 'secret', caption: 'Rahasia', width: 100 },
]);

class MemoryStorage implements StateStorage {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

function setup(hidden: string[] = ['secret']) {
  const onVisibilityChange = vi.fn();
  const container = document.createElement('div');
  container.style.width = '500px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: 3,
    columnChooser: true,
    hiddenColumns: hidden,
    onVisibilityChange,
  });
  const button = (): HTMLButtonElement =>
    grid.columnChooser?.element.querySelector(
      '.sui-grid__chooser-button',
    ) as HTMLButtonElement;
  const panel = (): HTMLElement | null =>
    document.querySelector('.sui-grid__chooser-panel');
  const options = (): HTMLElement[] => [
    ...(panel()?.querySelectorAll('.sui-grid__chooser-option') ?? []),
  ];
  const ids = (): (string | null)[] =>
    [...grid.headerElement.querySelectorAll('[role="columnheader"]')].map(
      (cell) => cell.getAttribute('data-column-id'),
    );
  return { container, grid, onVisibilityChange, button, panel, options, ids };
}

function cleanup(
  grid: ReturnType<typeof createGridView<Row>>,
  container: HTMLElement,
) {
  grid.dispose();
  container.remove();
  document.querySelector('.sui-grid__chooser-panel')?.remove();
}

describe('column chooser — panel', () => {
  it('membuka daftar kolom dengan state tersembunyi', () => {
    const { container, grid, button, panel, options } = setup();
    button().click();

    expect(panel()).not.toBeNull();
    expect(panel()?.getAttribute('role')).toBe('dialog');
    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(options().map((option) => option.textContent)).toEqual([
      'Nama',
      'Total',
      'Rahasia',
    ]);
    const checkboxes = options().map(
      (option) => option.querySelector('input') as HTMLInputElement,
    );
    expect(checkboxes.map((checkbox) => checkbox.checked)).toEqual([
      true,
      true,
      false,
    ]);
    expect(document.activeElement).toBe(checkboxes[0]);

    cleanup(grid, container);
  });

  it('mengubah visibilitas dan melapor daftar tersembunyi', () => {
    const { container, grid, onVisibilityChange, button, options } = setup();
    button().click();

    const total = options()[1]?.querySelector('input') as HTMLInputElement;
    total.checked = false;
    total.dispatchEvent(new Event('change'));

    expect(onVisibilityChange).toHaveBeenLastCalledWith(['secret', 'total']);
    expect(
      grid.headerElement.querySelector('[data-column-id="total"]'),
    ).toBeNull();

    cleanup(grid, container);
  });

  it('tampilkan semua mengosongkan daftar tersembunyi', () => {
    const { container, grid, onVisibilityChange, button, panel } = setup();
    button().click();

    (
      panel()?.querySelector('.sui-grid__chooser-all') as HTMLButtonElement
    ).click();
    expect(onVisibilityChange).toHaveBeenLastCalledWith([]);
    expect(
      grid.headerElement.querySelector('[data-column-id="secret"]'),
    ).not.toBeNull();

    cleanup(grid, container);
  });

  it('href setHiddenColumns dan klik luar', () => {
    const { container, grid, button, panel } = setup([]);
    grid.setHiddenColumns(['name']);
    expect(
      grid.headerElement.querySelector('[data-column-id="name"]'),
    ).toBeNull();

    button().click();
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    );
    expect(panel()).toBeNull();
    expect(button().getAttribute('aria-expanded')).toBe('false');

    cleanup(grid, container);
  });
});

describe('column chooser — persistensi', () => {
  it('meneruskan visibilitas ke state dan snapshot', () => {
    const state = createGridStateStore();
    const storage = new MemoryStorage();
    const persistence = createStatePersistence({
      state,
      storage,
      key: 'grid',
    });
    const container = document.createElement('div');
    document.body.append(container);
    const grid = createGridView<Row>({
      container,
      columns: COLUMNS,
      rowCount: 3,
      columnChooser: true,
      hiddenColumns: [],
      onVisibilityChange: (hidden) => {
        for (const column of COLUMNS) {
          state.setColumnHidden(column.id, hidden.includes(column.id));
        }
        persistence.save();
      },
    });

    grid.columnChooser?.element
      .querySelector<HTMLButtonElement>('.sui-grid__chooser-button')
      ?.click();
    const option = document.querySelectorAll<HTMLElement>(
      '.sui-grid__chooser-option',
    )[1];
    const checkbox = option?.querySelector('input') as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));

    const raw = storage.getItem('grid') as string;
    expect(JSON.parse(raw)['hiddenColumns']).toContain('total');

    cleanup(grid, container);
  });
});
