import { createLeakTracker } from '@simpleui/testing';
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
  { dataField: 'name', caption: 'Nama', width: 140 },
  { dataField: 'total', caption: 'Total', width: 100, dataType: 'number' },
]);

const ROWS: Row[] = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  name: `Nama ${index + 1}`,
  total: index + 1,
}));

function cycle(container: HTMLElement): void {
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
    headerFilter: true,
    getUniqueValues: () => [...new Set(ROWS.map((row) => row.name))],
    contextMenu: true,
    columnChooser: true,
    pager: true,
    pageIndex: 0,
    pageSize: 10,
    totalCount: ROWS.length,
    summaryItems: [{ column: 'total', summaryType: 'sum' }],
    summaryRows: ROWS,
  });
  const renderer = createRowRenderer<Row>({
    gridElement: grid.element,
    viewportElement: grid.viewportElement,
    spacerElement: grid.spacerElement,
    rowsElement: grid.rowsElement,
    columns: [grid.selectionColumn as never, ...COLUMNS],
    rows: ROWS,
    keyOf: (row) => row.id,
    isSelected: (row) => grid.isSelectedKey(row.id),
    selectionChanges: (listener) => grid.subscribeSelection(listener),
  });

  // Buka seluruh panel yang memasang listener global, lalu pastikan dispose
  // membersihkannya (bukan hanya DOM yang dihapus).
  grid.headerElement
    .querySelector<HTMLElement>('.sui-grid__header-filter')
    ?.click();
  grid.element.querySelector<HTMLElement>('[role="gridcell"]')?.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      clientX: 20,
      clientY: 20,
    }),
  );
  grid.host.querySelector<HTMLElement>('.sui-grid__chooser-button')?.click();
  const search = grid.host.querySelector<HTMLInputElement>(
    '.sui-grid__search-input',
  );
  if (search) {
    search.value = 'Nama';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  }

  renderer.dispose();
  grid.dispose();
}

describe('dispose 100x — DataGrid core', () => {
  it('tidak menyisakan listener global, timer, atau DOM', () => {
    const tracker = createLeakTracker();
    const container = document.createElement('div');
    container.style.width = '700px';
    container.style.height = '320px';
    document.body.append(container);
    const baseline = tracker.snapshot();

    for (let index = 0; index < 100; index += 1) {
      cycle(container);
      expect(container.querySelector('.sui-grid')).toBeNull();
    }

    const after = tracker.snapshot();
    expect(after.documentListeners).toBe(baseline.documentListeners);
    expect(after.windowListeners).toBe(baseline.windowListeners);
    expect(after.timers).toBe(baseline.timers);

    container.remove();
    tracker.dispose();
  });
});
