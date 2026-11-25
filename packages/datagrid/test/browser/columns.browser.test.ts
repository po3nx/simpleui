import { describe, expect, it } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
}

function manyColumns(): ReturnType<typeof normalizeColumnModel<Row>> {
  const middle = Array.from({ length: 30 }, (_, index) => ({
    dataField: 'id' as const,
    id: `c${index}`,
    caption: `C${index}`,
    width: 100,
  }));
  return normalizeColumnModel<Row>([
    {
      dataField: 'id',
      id: 'pin-start',
      caption: 'Pin',
      width: 80,
      fixed: 'start',
    },
    ...middle,
    { dataField: 'id', id: 'pin-end', caption: 'End', width: 80, fixed: 'end' },
  ]);
}

function setup(columns = manyColumns(), width = 320) {
  const container = document.createElement('div');
  container.style.width = `${width}px`;
  container.style.height = '300px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns,
    rowCount: 20,
    rowHeight: 40,
  });
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns,
    rows: Array.from({ length: 20 }, (_, index) => ({ id: index + 1 })),
    keyOf: (row) => row.id,
    rowHeight: 40,
    overscan: 2,
  });
  const headers = (): HTMLElement[] => [
    ...grid.headerElement.querySelectorAll<HTMLElement>(
      '[role="columnheader"]',
    ),
  ];
  return { container, grid, renderer, headers };
}

describe('column virtualization', () => {
  it('hanya merender kolom yang terlihat, termasuk kolom fixed', () => {
    const { headers, grid, renderer, container } = setup();

    const ids = headers().map((cell) => cell.getAttribute('data-column-id'));
    expect(ids.length).toBeLessThan(32);
    expect(ids[0]).toBe('pin-start');
    expect(ids[ids.length - 1]).toBe('pin-end');
    expect(grid.element.getAttribute('aria-colcount')).toBe('32');

    const firstRow = grid.rowsElement.firstElementChild as HTMLElement;
    expect(firstRow.querySelectorAll('[role="gridcell"]')).toHaveLength(
      ids.length,
    );

    renderer.dispose();
    container.remove();
  });

  it('kolom fixed memakai position sticky dan offset 0', () => {
    const { headers, renderer, container } = setup();
    const pin = headers()[0] as HTMLElement;
    const end = headers()[headers().length - 1] as HTMLElement;

    expect(getComputedStyle(pin).position).toBe('sticky');
    expect(getComputedStyle(end).position).toBe('sticky');
    expect(pin.classList.contains('sui-grid__header-cell--sticky-start')).toBe(
      true,
    );
    expect(end.classList.contains('sui-grid__header-cell--sticky-end')).toBe(
      true,
    );

    renderer.dispose();
    container.remove();
  });

  it('scroll horizontal menggeser jendela kolom dan menampilkan shadow', () => {
    const { headers, grid, renderer, container } = setup();
    const before = headers().map((cell) => cell.getAttribute('data-column-id'));

    grid.viewportElement.scrollLeft = 1500;
    grid.viewportElement.dispatchEvent(new Event('scroll'));

    const after = headers().map((cell) => cell.getAttribute('data-column-id'));
    expect(after[0]).toBe('pin-start');
    expect(after[after.length - 1]).toBe('pin-end');
    expect(after).not.toEqual(before);

    expect(grid.element.classList.contains('sui-grid--shadow-start')).toBe(
      true,
    );
    expect(grid.element.classList.contains('sui-grid--shadow-end')).toBe(true);
    const pin = headers()[0] as HTMLElement;
    const end = headers()[headers().length - 1] as HTMLElement;
    expect(pin.classList.contains('sui-grid__cell--shadow-start')).toBe(true);
    expect(end.classList.contains('sui-grid__cell--shadow-end')).toBe(true);

    renderer.dispose();
    container.remove();
  });

  it('merender semua kolom bila muat', () => {
    const columns = normalizeColumnModel<Row>([
      { dataField: 'id', caption: 'ID', width: 80 },
      { dataField: 'id', id: 'b', caption: 'B', width: 80 },
    ]);
    const { headers, renderer, container } = setup(columns, 600);

    expect(headers()).toHaveLength(2);
    expect(renderer.getRenderedCount()).toBeGreaterThan(0);

    renderer.dispose();
    container.remove();
  });
});
