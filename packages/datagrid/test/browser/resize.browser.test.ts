import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
  name: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'id', caption: 'ID', width: 100, minWidth: 80, maxWidth: 200 },
  { dataField: 'name', caption: 'Nama', width: 150, allowResizing: false },
]);

function setup(onColumnResize?: (id: string, width: number) => void) {
  const container = document.createElement('div');
  container.style.height = '200px';
  container.style.width = '500px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: 5,
    onColumnResize,
  });
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns: COLUMNS,
    rows: Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      name: 'Nama',
    })),
    keyOf: (row) => row.id,
  });
  const handles = (): HTMLElement[] => [
    ...grid.headerElement.querySelectorAll<HTMLElement>(
      '.sui-grid__resize-handle',
    ),
  ];
  const widthOf = (columnId: string): string =>
    (
      grid.headerElement.querySelector(
        `[data-column-id="${columnId}"]`,
      ) as HTMLElement | null
    )?.style.flexBasis ?? '';
  const rowWidthOf = (columnId: string): string =>
    (
      grid.rowsElement.querySelector(
        `[data-column-id="${columnId}"]`,
      ) as HTMLElement | null
    )?.style.flexBasis ?? '';
  return { container, grid, renderer, handles, widthOf, rowWidthOf };
}

describe('column resize — handle dan ARIA', () => {
  it('hanya menampilkan handle untuk kolom yang boleh di-resize', () => {
    const { container, grid, renderer, handles } = setup();
    const cells = grid.headerElement.querySelectorAll('[data-column-id]');

    expect(cells[0]?.querySelector('.sui-grid__resize-handle')).not.toBeNull();
    expect(cells[1]?.querySelector('.sui-grid__resize-handle')).toBeNull();

    const handle = handles()[0] as HTMLElement;
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-valuenow')).toBe('100');
    expect(handle.getAttribute('aria-valuemin')).toBe('80');
    expect(handle.getAttribute('aria-valuemax')).toBe('200');
    expect(handle.getAttribute('tabindex')).toBe('0');

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});

describe('column resize — keyboard', () => {
  it('ArrowRight/ArrowLeft mengubah lebar dan commit', () => {
    const onResize = vi.fn();
    const { container, grid, renderer, handles, widthOf, rowWidthOf } =
      setup(onResize);
    const handle = handles()[0] as HTMLElement;

    handle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(onResize).toHaveBeenLastCalledWith('id', 110);
    expect(handle.getAttribute('aria-valuenow')).toBe('110');
    expect(widthOf('id')).toBe('110px');
    expect(rowWidthOf('id')).toBe('110px');
    expect(grid.spacerElement.style.inlineSize).toBe('260px');

    handle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
    );
    expect(onResize).toHaveBeenLastCalledWith('id', 100);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('clamp pada min dan max', () => {
    const onResize = vi.fn();
    const { container, grid, renderer, handles } = setup(onResize);
    const handle = handles()[0] as HTMLElement;

    for (let index = 0; index < 20; index += 1) {
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
    }
    expect(onResize).toHaveBeenLastCalledWith('id', 200);

    for (let index = 0; index < 20; index += 1) {
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
    }
    expect(onResize).toHaveBeenLastCalledWith('id', 80);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});

describe('column resize — pointer', () => {
  it('drag memperbarui preview dan commit saat pointerup', () => {
    const onResize = vi.fn();
    const { container, grid, renderer, handles, widthOf } = setup(onResize);
    const handle = handles()[0] as HTMLElement;

    handle.dispatchEvent(
      new PointerEvent('pointerdown', {
        button: 0,
        clientX: 100,
        pointerId: 1,
        bubbles: true,
      }),
    );
    window.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 140, pointerId: 1 }),
    );
    expect(widthOf('id')).toBe('140px');
    expect(onResize).not.toHaveBeenCalled();

    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalledWith('id', 140);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});

describe('column resize — persistensi', () => {
  it('lebar header tidak reset setelah sorting', () => {
    const { container, grid, renderer, handles, widthOf, rowWidthOf } = setup();
    const handle = handles()[0] as HTMLElement;
    handle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(widthOf('id')).toBe('110px');

    grid.headerElement
      .querySelector<HTMLElement>(
        '[data-column-id="id"] .sui-grid__header-button',
      )
      ?.click();

    expect(widthOf('id')).toBe('110px');
    expect(rowWidthOf('id')).toBe('110px');
    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
