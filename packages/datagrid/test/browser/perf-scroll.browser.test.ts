import { describe, expect, it } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
  name: string;
  city: string;
  total: number;
  note: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 140 },
  { dataField: 'city', caption: 'Kota', width: 120 },
  { dataField: 'total', caption: 'Total', width: 100, dataType: 'number' },
  { dataField: 'note', caption: 'Catatan', width: 160 },
]);

const ROWS: Row[] = Array.from({ length: 10_000 }, (_, index) => ({
  id: index + 1,
  name: `Nama ${index + 1}`,
  city: `Kota ${index % 50}`,
  total: index,
  note: `Catatan ${index + 1}`,
}));

function percentile(values: readonly number[], ratio: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] ?? 0
  );
}

describe('performa scroll — 10k baris', () => {
  it('render per langkah scroll berada dalam budget 60 fps', () => {
    const container = document.createElement('div');
    container.style.width = '720px';
    container.style.height = '400px';
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
      rowHeight: 40,
      overscan: 5,
    });

    for (let index = 0; index < 10; index += 1) {
      grid.viewportElement.scrollTop = index * 200;
      grid.viewportElement.dispatchEvent(new Event('scroll'));
    }

    const durations: number[] = [];
    for (let index = 0; index < 120; index += 1) {
      const started = performance.now();
      grid.viewportElement.scrollTop = index * 800;
      grid.viewportElement.dispatchEvent(new Event('scroll'));
      durations.push(performance.now() - started);
    }

    const median = percentile(durations, 0.5);
    const p95 = percentile(durations, 0.95);
    console.log(
      `grid 10k scroll: median ${median.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms, nodes ${grid.rowsElement.childElementCount}`,
    );

    expect(renderer.getRenderedCount()).toBeLessThan(40);
    expect(grid.rowsElement.childElementCount).toBeLessThan(40);
    expect(median).toBeLessThan(16.7);
    expect(p95).toBeLessThan(33.3);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
