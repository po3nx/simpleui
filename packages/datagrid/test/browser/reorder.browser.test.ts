import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { applyColumnOrder } from '../../src/view/column-reorder.js';
import { createGridView } from '../../src/view/grid-view.js';

interface Row {
  id: number;
  a: string;
  b: string;
  c: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'a', caption: 'A', width: 80 },
  { dataField: 'b', caption: 'B', width: 80 },
  { dataField: 'c', caption: 'C', width: 80, allowReordering: false },
]);

function setup(onColumnReorder?: (order: readonly string[]) => void) {
  const container = document.createElement('div');
  container.style.width = '600px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: 5,
    onColumnReorder,
  });
  const headers = (): HTMLElement[] => [
    ...grid.headerElement.querySelectorAll<HTMLElement>(
      '[role="columnheader"]',
    ),
  ];
  const ids = (): (string | null)[] =>
    headers().map((cell) => cell.getAttribute('data-column-id'));
  return { container, grid, headers, ids };
}

describe('column reorder — drag', () => {
  it('memindahkan kolom ke sebelum target dan melaporkan urutan', () => {
    const onReorder = vi.fn();
    const { container, grid, headers, ids } = setup(onReorder);

    const source = headers()[1] as HTMLElement;
    const target = headers()[0] as HTMLElement;
    expect(source.draggable).toBe(true);

    const transfer = new DataTransfer();
    source.dispatchEvent(
      new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }),
    );
    target.dispatchEvent(
      new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );
    expect(target.classList.contains('sui-grid__header-cell--drop')).toBe(true);

    target.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );

    expect(onReorder).toHaveBeenCalledTimes(1);
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
    expect(target.classList.contains('sui-grid__header-cell--drop')).toBe(
      false,
    );

    grid.setColumns(applyColumnOrder(COLUMNS, ['b', 'a', 'c']));
    expect(ids()).toEqual(['b', 'a', 'c']);

    grid.dispose();
    container.remove();
  });

  it('kolom allowReordering=false tidak dapat di-drag', () => {
    const { container, grid, headers } = setup();
    const locked = headers()[2] as HTMLElement;

    expect(locked.draggable).toBe(false);
    expect(
      locked.classList.contains('sui-grid__header-cell--reorderable'),
    ).toBe(false);

    grid.dispose();
    container.remove();
  });
});

describe('column reorder — keyboard', () => {
  it('Alt+ArrowRight memindahkan kolom dan mengumumkan posisi', () => {
    const onReorder = vi.fn();
    const { container, grid, headers } = setup(onReorder);
    const button = headers()[0]?.querySelector('button') as HTMLButtonElement;

    button.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        altKey: true,
        bubbles: true,
      }),
    );

    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
    expect(grid.liveElement.textContent).toContain(
      'Kolom A dipindah ke posisi 2',
    );

    grid.dispose();
    container.remove();
  });

  it('tidak melapor bila sudah di ujung', () => {
    const onReorder = vi.fn();
    const { container, grid, headers } = setup(onReorder);
    const button = headers()[2]?.querySelector('button') as HTMLButtonElement;

    button.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        altKey: true,
        bubbles: true,
      }),
    );

    expect(onReorder).not.toHaveBeenCalled();

    grid.dispose();
    container.remove();
  });
});
