import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createPrintView } from '../../src/view/print.js';

interface Row {
  id: number;
  name: string;
  total: number;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'id', caption: 'ID', visible: false },
  { dataField: 'name', caption: 'Nama' },
  { dataField: 'total', caption: 'Total', dataType: 'number' },
]);
const ROWS: Row[] = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  name: `Nama ${index + 1}`,
  total: (index + 1) * 10,
}));

describe('print view', () => {
  it('membangun tabel semua baris dengan header dan page break', () => {
    const view = createPrintView({
      rows: ROWS,
      columns: COLUMNS,
      title: 'Laporan',
      pageBreakEvery: 2,
    });
    expect(view.element.tagName).toBe('TABLE');
    expect(view.element.querySelector('caption')?.textContent).toBe('Laporan');
    expect(
      [...view.element.querySelectorAll('thead th')].map(
        (cell) => cell.textContent,
      ),
    ).toEqual(['Nama', 'Total']);
    expect(view.element.querySelectorAll('tbody tr')).toHaveLength(7);
    expect(
      view.element.querySelectorAll('.sui-grid-print__break'),
    ).toHaveLength(2);
    expect(view.element.querySelector('tbody td')?.textContent).toBe('Nama 1');

    view.dispose();
  });

  it('print menempelkan tabel dan afterprint membersihkannya', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const view = createPrintView({ rows: ROWS, columns: COLUMNS });
    view.print();
    expect(document.body.contains(view.element)).toBe(true);
    expect(print).toHaveBeenCalled();

    window.dispatchEvent(new Event('afterprint'));
    expect(document.body.contains(view.element)).toBe(false);
    print.mockRestore();
  });
});
