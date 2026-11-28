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
];

function setup(options: {
  rowTemplate?: (container: HTMLElement, context: { row: Row }) => void;
  groupTemplate?: (
    container: HTMLElement,
    context: { node: { value: unknown }; expanded: boolean },
  ) => void;
  groupBy?: string[];
}) {
  const container = document.createElement('div');
  container.style.width = '600px';
  container.style.height = '300px';
  document.body.append(container);
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
    ...(options.rowTemplate ? { rowTemplate: options.rowTemplate } : {}),
    ...(options.groupTemplate
      ? { groupTemplate: options.groupTemplate as never }
      : {}),
    ...(options.groupBy ? { groupBy: options.groupBy } : {}),
  });
  return { container, grid, renderer };
}

describe('row template', () => {
  it('mengganti seluruh sel dengan template dan tetap role row/gridcell', () => {
    const rowTemplate = vi.fn((element: HTMLElement, context: { row: Row }) => {
      const strong = document.createElement('strong');
      strong.textContent = `Baris ${context.row.name}`;
      element.append(strong);
    });
    const { container, grid, renderer } = setup({ rowTemplate });
    const row = grid.rowsElement.querySelector<HTMLElement>(
      '.sui-grid__row:not([hidden])',
    );
    expect(rowTemplate).toHaveBeenCalled();
    expect(row?.getAttribute('aria-rowindex')).toBe('1');
    expect(row?.getAttribute('data-row-key')).toBe('1');
    const cell = row?.querySelector<HTMLElement>('[role="gridcell"]');
    expect(cell?.getAttribute('aria-colspan')).toBe('2');
    expect(cell?.textContent).toContain('Baris Ani');
    expect(row?.querySelectorAll('[role="gridcell"]')).toHaveLength(1);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});

describe('group template', () => {
  it('merender isi grup kustom dan toggle tetap bekerja', () => {
    const groupTemplate = vi.fn(
      (element: HTMLElement, context: { node: { value: unknown } }) => {
        element.textContent = `Grup ${String(context.node.value)}`;
      },
    );
    const { container, grid, renderer } = setup({
      groupBy: ['city'],
      groupTemplate,
    });
    const group = grid.rowsElement.querySelector<HTMLElement>(
      '.sui-grid__row--group',
    );
    expect(groupTemplate).toHaveBeenCalled();
    expect(group?.textContent).toContain('Grup Jakarta');
    group?.querySelector<HTMLButtonElement>('.sui-grid__group-toggle')?.click();
    expect(
      grid.rowsElement.querySelectorAll(
        '.sui-grid__rows .sui-grid__row[data-row-key]:not([hidden])',
      ),
    ).toHaveLength(2);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
