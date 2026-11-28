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
  { dataField: 'name', caption: 'Nama', width: 160 },
]);
const ROWS: Row[] = [
  { id: 1, name: 'Ani' },
  { id: 2, name: 'Budi' },
];

function setup() {
  const container = document.createElement('div');
  container.style.width = '600px';
  container.style.height = '400px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: ROWS.length,
    rowHeight: 40,
  });
  let resolveLoad: ((value: unknown) => void) | undefined;
  let rejectLoad: ((error: unknown) => void) | undefined;
  const load = vi.fn(
    () =>
      new Promise<unknown>((resolve, reject) => {
        resolveLoad = resolve;
        rejectLoad = reject;
      }),
  );
  const template = vi.fn((element: HTMLElement, context: { data: unknown }) => {
    element.textContent = `Detail: ${String(context.data)}`;
  });
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns: COLUMNS,
    rows: ROWS,
    keyOf: (row) => row.id,
    masterDetail: { enabled: true, load, template },
  });
  const detailRows = (): HTMLElement[] => [
    ...grid.rowsElement.querySelectorAll<HTMLElement>('.sui-grid__row--detail'),
  ];
  return {
    container,
    grid,
    renderer,
    load,
    template,
    detailRows,
    resolve: (value: unknown) => resolveLoad?.(value),
    reject: (error: unknown) => rejectLoad?.(error),
  };
}

describe('master-detail', () => {
  it('toggle menampilkan loading lalu template dengan data async', async () => {
    const { container, grid, renderer, load, template, detailRows, resolve } =
      setup();
    expect(
      grid.rowsElement.querySelector('.sui-grid__detail-toggle'),
    ).not.toBeNull();

    renderer.toggleDetail(1);
    expect(load).toHaveBeenCalledWith(ROWS[0], 1);
    expect(detailRows()).toHaveLength(1);
    expect(detailRows()[0]?.textContent).toContain('Memuat detail');

    resolve('rahasia');
    await expect
      .poll(() => detailRows()[0]?.textContent)
      .toBe('Detail: rahasia');
    expect(template).toHaveBeenCalled();
    expect(detailRows()[0]?.getAttribute('aria-rowindex')).toBe('2');
    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('toggle kedua menutup baris detail', () => {
    const { container, grid, renderer, detailRows } = setup();
    renderer.toggleDetail(1);
    expect(detailRows()).toHaveLength(1);
    renderer.toggleDetail(1);
    expect(detailRows()).toHaveLength(0);
    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('error load ditampilkan sebagai alert', async () => {
    const { container, grid, renderer, detailRows, reject } = setup();
    renderer.toggleDetail(1);
    reject(new Error('offline'));
    await expect
      .poll(() => detailRows()[0]?.textContent)
      .toBe('Gagal memuat detail.');
    expect(detailRows()[0]?.querySelector('[role="alert"]')).not.toBeNull();
    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('tombol detail men-trigger toggle', () => {
    const { container, grid, renderer, detailRows } = setup();
    grid.rowsElement
      .querySelector<HTMLButtonElement>('.sui-grid__detail-toggle')
      ?.click();
    expect(detailRows()).toHaveLength(1);
    expect(
      grid.rowsElement
        .querySelector('.sui-grid__detail-toggle')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
