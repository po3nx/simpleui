import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';
import { guardClipboardText, tsvCell } from '../../src/view/context-menu.js';

interface Row {
  id: number;
  name: string;
  formula: string;
  total: number;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 100 },
  { dataField: 'formula', caption: 'Formula', width: 100 },
  { dataField: 'total', caption: 'Total', width: 80, dataType: 'number' },
]);

const ROWS: Row[] = [
  { id: 1, name: 'Ani', formula: '=1+1', total: 10 },
  { id: 2, name: 'Budi', formula: 'aman', total: 20 },
];

function setup(contextMenu = true) {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  const container = document.createElement('div');
  container.style.width = '500px';
  container.style.height = '200px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: ROWS.length,
    contextMenu,
  });
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns: COLUMNS,
    rows: ROWS,
    keyOf: (row) => row.id,
  });
  const firstCell = (): HTMLElement =>
    grid.rowsElement.querySelector('[role="gridcell"]') as HTMLElement;
  const menu = (): HTMLElement | null =>
    document.querySelector('.sui-grid__context-menu');
  return { container, grid, renderer, writeText, firstCell, menu };
}

function cleanup(
  grid: ReturnType<typeof createGridView<Row>>,
  container: HTMLElement,
) {
  grid.dispose();
  container.remove();
  document.querySelector('.sui-grid__context-menu')?.remove();
}

describe('context menu — copy', () => {
  it('klik kanan membuka menu dan menyalin sel dengan guard formula', () => {
    const { container, grid, renderer, writeText, menu } = setup();
    const formulaCell = grid.rowsElement.querySelectorAll(
      '[role="gridcell"]',
    )[1] as HTMLElement;

    formulaCell.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: 10,
        clientY: 10,
      }),
    );

    expect(menu()).not.toBeNull();
    expect(menu()?.getAttribute('role')).toBe('menu');
    expect(menu()?.querySelectorAll('[role="menuitem"]')).toHaveLength(2);

    (menu()?.querySelector('button') as HTMLButtonElement).click();
    expect(writeText).toHaveBeenCalledWith("'=1+1");
    expect(menu()).toBeNull();

    renderer.dispose();
    cleanup(grid, container);
  });

  it('menyalin baris sebagai TSV aman', () => {
    const { container, grid, renderer, writeText, firstCell, menu } = setup();

    firstCell().dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: 10,
        clientY: 10,
      }),
    );
    (menu()?.querySelectorAll('button')[1] as HTMLButtonElement).click();

    expect(writeText).toHaveBeenCalledWith("Ani\t'=1+1\t10");

    renderer.dispose();
    cleanup(grid, container);
  });

  it('guard dan quoting TSV benar', () => {
    expect(guardClipboardText('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(guardClipboardText('aman')).toBe('aman');
    expect(tsvCell('a\tb')).toBe('"a\tb"');
    expect(tsvCell('=1+1')).toBe("'=1+1");
  });
});

describe('context menu — keyboard dan opsi', () => {
  it('Shift+F10 membuka menu dan Escape menutup', () => {
    const { container, grid, renderer, firstCell, menu } = setup();
    firstCell().focus();

    firstCell().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'F10',
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(menu()).not.toBeNull();

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(menu()).toBeNull();

    renderer.dispose();
    cleanup(grid, container);
  });

  it('contextMenu=false tidak membuka menu', () => {
    const { container, grid, renderer, firstCell, menu } = setup(false);

    firstCell().dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 5, clientY: 5 }),
    );
    expect(menu()).toBeNull();

    renderer.dispose();
    cleanup(grid, container);
  });

  it('klik di luar menutup menu', () => {
    const { container, grid, renderer, firstCell, menu } = setup();
    firstCell().dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 5, clientY: 5 }),
    );

    document.body.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    );
    expect(menu()).toBeNull();

    renderer.dispose();
    cleanup(grid, container);
  });
});
