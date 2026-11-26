import { captureAriaSnapshot } from '@simpleui/testing';
import { describe, expect, it } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
  name: string;
  total: number;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 120 },
  { dataField: 'total', caption: 'Total', width: 100, dataType: 'number' },
]);

const ROWS: Row[] = [
  { id: 1, name: 'Ani', total: 10 },
  { id: 2, name: 'Budi', total: 20 },
];

describe('a11y snapshot grid (DG-057)', () => {
  it('struktur role/nama/atribut stabil', () => {
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '300px';
    document.body.append(container);

    const grid = createGridView<Row>({
      container,
      columns: COLUMNS,
      rowCount: ROWS.length,
      rowHeight: 40,
      selectionMode: 'multiple',
      rowKey: (row) => row.id,
      getVisibleKeys: () => ROWS.map((row) => row.id),
      filterRow: true,
      searchPanel: true,
      pager: true,
      pageIndex: 0,
      pageSize: 10,
      totalCount: ROWS.length,
      summaryItems: [{ column: 'total', summaryType: 'sum' }],
      summaryRows: ROWS,
      sortBy: [{ selector: 'name', desc: false }],
    });
    const renderer = createRowRenderer<Row>({
      gridElement: grid.element,
      viewportElement: grid.viewportElement,
      spacerElement: grid.spacerElement,
      rowsElement: grid.rowsElement,
      columns: grid.selectionColumn
        ? [grid.selectionColumn as never, ...COLUMNS]
        : COLUMNS,
      rows: ROWS,
      keyOf: (row) => row.id,
      isSelected: (row) => grid.isSelectedKey(row.id),
      selectionChanges: (listener) => grid.subscribeSelection(listener),
    });

    const snapshot = captureAriaSnapshot(container);
    expect(snapshot).toContain('grid "Data grid"');
    expect(snapshot).toContain('columnheader');
    expect(snapshot).toContain('aria-sort="ascending"');
    expect(snapshot).toMatchSnapshot();

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
