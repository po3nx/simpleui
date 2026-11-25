import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'id', caption: 'ID', width: 80 },
]);

function setup(messages?: Record<string, string>) {
  const container = document.createElement('div');
  container.style.height = '200px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns: COLUMNS,
    rowCount: 10,
    messages,
  });
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns: COLUMNS,
    rows: Array.from({ length: 10 }, (_, index) => ({ id: index + 1 })),
    keyOf: (row) => row.id,
  });
  return { container, grid, renderer };
}

describe('status — loading/empty/no-data', () => {
  it('tersembunyi secara default', () => {
    const { container, grid, renderer } = setup();
    expect(grid.status.element.hidden).toBe(true);
    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('loading menampilkan spinner dan mempertahankan baris lama', () => {
    const { container, grid, renderer } = setup();
    grid.setStatus('loading');

    expect(grid.status.element.hidden).toBe(false);
    expect(grid.status.element.getAttribute('role')).toBe('status');
    expect(grid.status.element.getAttribute('aria-live')).toBe('polite');
    expect(
      grid.status.element.querySelector('.sui-grid__spinner'),
    ).not.toBeNull();
    expect(grid.status.element.textContent).toContain('Memuat data');
    expect(renderer.getRenderedCount()).toBeGreaterThan(0);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('empty dan no-data memakai pesan berbeda', () => {
    const { container, grid, renderer } = setup();

    grid.setStatus('empty');
    const emptyText = grid.status.element.textContent;
    grid.setStatus('no-data');
    const noDataText = grid.status.element.textContent;

    expect(emptyText).toContain('filter');
    expect(noDataText).toContain('Tidak ada data');
    expect(emptyText).not.toBe(noDataText);
    expect(grid.status.element.querySelector('.sui-grid__spinner')).toBeNull();

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('pesan dapat dioverride', () => {
    const { container, grid, renderer } = setup({ noData: 'Belum ada baris' });
    grid.setStatus('no-data');

    expect(grid.status.element.textContent).toContain('Belum ada baris');
    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});

describe('status — error dan retry', () => {
  it('error memakai role alert dan menampilkan retry saat retryable', () => {
    const onRetry = vi.fn();
    const { container, grid, renderer } = setup();

    grid.setStatus('error', { retryable: true, onRetry });

    expect(grid.status.element.getAttribute('role')).toBe('alert');
    expect(grid.status.element.getAttribute('aria-live')).toBe('assertive');
    expect(grid.status.element.textContent).toContain('Gagal memuat data');

    grid.status.element
      .querySelector<HTMLButtonElement>('.sui-grid__retry')
      ?.click();
    expect(onRetry).toHaveBeenCalledTimes(1);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('error non-retryable tidak menampilkan tombol retry', () => {
    const { container, grid, renderer } = setup();
    grid.setStatus('error', { message: 'Akses ditolak', retryable: false });

    expect(grid.status.element.textContent).toContain('Akses ditolak');
    expect(grid.status.element.querySelector('.sui-grid__retry')).toBeNull();

    renderer.dispose();
    grid.dispose();
    container.remove();
  });

  it('setStatus(null) menyembunyikan overlay', () => {
    const { container, grid, renderer } = setup();
    grid.setStatus('loading');
    grid.setStatus(null);

    expect(grid.status.element.hidden).toBe(true);
    expect(grid.status.element.hasAttribute('data-status')).toBe(false);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
