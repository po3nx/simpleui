import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import '../../../theme/src/index.css';
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
  { dataField: 'name', caption: 'Nama', width: 160 },
  { dataField: 'total', caption: 'Total', width: 120, dataType: 'number' },
]);

const ROWS: Row[] = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  name: `Nama ${index + 1}`,
  total: index * 10,
}));

describe('a11y grid — axe', () => {
  it('tidak memiliki pelanggaran critical/serious', async () => {
    const container = document.createElement('div');
    container.style.width = '600px';
    container.style.height = '300px';
    document.body.append(container);

    const grid = createGridView<Row>({
      container,
      columns: COLUMNS,
      rowCount: ROWS.length,
      rowHeight: 40,
      filterRow: true,
      searchPanel: true,
      pager: true,
      pageIndex: 0,
      pageSize: 20,
      totalCount: ROWS.length,
      summaryItems: [{ column: 'total', summaryType: 'sum' }],
      summaryRows: ROWS,
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

    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    const serious = results.violations.filter(
      (violation) =>
        violation.impact === 'critical' || violation.impact === 'serious',
    );
    if (serious.length > 0) {
      console.log(
        JSON.stringify(
          serious.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            nodes: violation.nodes.map((node) => ({
              target: node.target,
              html: node.html,
              failure: node.failureSummary,
            })),
          })),
          null,
          2,
        ),
      );
    }
    expect(serious).toEqual([]);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
