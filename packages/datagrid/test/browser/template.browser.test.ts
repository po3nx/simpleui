import type { TemplateContext, TemplateRenderer } from '@simpleui/core';
import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
  name: string;
}

function fakeTemplate(prefix = 'T') {
  const mounts: unknown[] = [];
  const updates: unknown[] = [];
  const disposes: TemplateContext<unknown>[] = [];

  const renderer: TemplateRenderer = (container, context) => {
    mounts.push(context);
    container.textContent = `${prefix}:${String(context.value)}`;
    return {
      update(next) {
        updates.push(next);
        container.textContent = `${prefix}:${String(next.value)}`;
      },
      dispose() {
        disposes.push(context);
      },
    };
  };

  return { renderer, mounts, updates, disposes };
}

function makeRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Nama ${index + 1}`,
  }));
}

function setup(
  columns: ReturnType<typeof normalizeColumnModel<Row>>,
  rows: Row[],
) {
  const container = document.createElement('div');
  container.style.height = '300px';
  container.style.width = '500px';
  document.body.append(container);
  const grid = createGridView<Row>({
    container,
    columns,
    rowCount: rows.length,
    rowHeight: 40,
  });
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns,
    rows,
    keyOf: (row) => row.id,
    rowHeight: 40,
    overscan: 1,
  });
  return { container, grid, renderer };
}

describe('template sel', () => {
  const template = fakeTemplate();

  function columns() {
    return normalizeColumnModel<Row>([
      { dataField: 'id', caption: 'ID', width: 80 },
      {
        dataField: 'name',
        caption: 'Nama',
        width: 200,
        cellTemplate: template.renderer,
      },
    ]);
  }

  it('me-mount template untuk sel terlihat dengan konteks baris', () => {
    const { container, grid, renderer } = setup(columns(), makeRows(100));

    expect(template.mounts.length).toBeGreaterThan(0);
    const cell = grid.rowsElement.querySelector(
      '[role="gridcell"][data-column-id="name"]',
    );
    expect(cell?.textContent).toBe('T:Nama 1');

    const context = template.mounts[0] as TemplateContext<Row>;
    expect(context.row?.id).toBe(1);
    expect(context.column?.field).toBe('name');
    expect(context.value).toBe('Nama 1');

    renderer.dispose();
    container.remove();
  });

  it('mendaur ulang handle saat scroll (update, bukan mount baru)', () => {
    const { container, grid, renderer } = setup(columns(), makeRows(100));
    grid.viewportElement.scrollTop = 400;
    grid.viewportElement.dispatchEvent(new Event('scroll'));
    const mountsAfterWarmup = template.mounts.length;

    grid.viewportElement.scrollTop = 800;
    grid.viewportElement.dispatchEvent(new Event('scroll'));

    // Scroll pertama boleh menambah satu baris pool baru; scroll berikutnya
    // wajib mendaur ulang handle, bukan mount baru.
    expect(template.mounts.length).toBe(mountsAfterWarmup);
    expect(template.updates.length).toBeGreaterThan(0);

    renderer.dispose();
    container.remove();
  });

  it('setRows memperbarui handle tanpa mount ulang', () => {
    const { container, renderer } = setup(columns(), makeRows(20));
    const mountsBefore = template.mounts.length;

    renderer.setRows(
      makeRows(20).map((row) => ({ ...row, name: `${row.name}!` })),
    );

    expect(template.mounts.length).toBe(mountsBefore);
    expect(template.updates.length).toBeGreaterThan(0);

    renderer.dispose();
    container.remove();
  });

  it('melepas handle saat kolom template diganti dan saat dispose', () => {
    const local = fakeTemplate();
    const cols = normalizeColumnModel<Row>([
      {
        dataField: 'name',
        caption: 'Nama',
        cellTemplate: local.renderer,
      },
    ]);
    const { container, renderer } = setup(cols, makeRows(10));
    const mounted = local.mounts.length;

    renderer.setColumns(normalizeColumnModel<Row>([{ dataField: 'name' }]));
    expect(local.disposes.length).toBe(mounted);

    renderer.dispose();
    container.remove();
  });

  it('error template dilaporkan dan sel lain tetap dirender', () => {
    const onTemplateError = vi.fn();
    const broken: TemplateRenderer = () => {
      throw new Error('template rusak');
    };
    const cols = normalizeColumnModel<Row>([
      { dataField: 'id', caption: 'ID', width: 80 },
      { dataField: 'name', caption: 'Nama', cellTemplate: broken },
    ]);

    const container = document.createElement('div');
    container.style.height = '200px';
    document.body.append(container);
    const grid = createGridView<Row>({ container, columns: cols, rowCount: 5 });
    const renderer = createRowRenderer<Row>({
      gridElement: grid.element,
      viewportElement: grid.viewportElement,
      spacerElement: grid.spacerElement,
      rowsElement: grid.rowsElement,
      columns: cols,
      rows: makeRows(5),
      keyOf: (row) => row.id,
      onTemplateError,
    });

    expect(onTemplateError).toHaveBeenCalled();
    expect(onTemplateError.mock.calls[0]?.[1]).toBe('render');
    const idCell = grid.rowsElement.querySelector(
      '[role="gridcell"][data-column-id="id"]',
    );
    expect(idCell?.textContent).toBe('1');

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});

describe('template header', () => {
  it('merender header via template dan tetap bisa di-sort', () => {
    const headerTemplate = fakeTemplate('H');
    const onSortChange = vi.fn();
    const columns = normalizeColumnModel<Row>([
      {
        dataField: 'name',
        caption: 'Nama',
        headerCellTemplate: headerTemplate.renderer,
      },
    ]);
    const container = document.createElement('div');
    document.body.append(container);
    const grid = createGridView<Row>({
      container,
      columns,
      rowCount: 5,
      onSortChange,
    });

    const button = grid.headerElement.querySelector('button');
    expect(button?.textContent).toContain('H:Nama');

    button?.click();
    expect(onSortChange).toHaveBeenCalled();

    grid.dispose();
    expect(headerTemplate.disposes.length).toBeGreaterThan(0);
    container.remove();
  });
});
