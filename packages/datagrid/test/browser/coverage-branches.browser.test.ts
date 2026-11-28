import { describe, expect, it } from 'vitest';
import '../../src/styles/grid.css';
import {
  cellValueFor,
  formatCellValue,
  formatRowCell,
  setCellText,
} from '../../src/view/cell-renderer.js';
import {
  buildGroupEntries,
  groupCaption,
  groupLabel,
} from '../../src/view/group-view.js';
import {
  moveColumn,
  moveColumnTo,
  visibleColumnIds,
} from '../../src/view/column-reorder.js';
import { normalizeColumnModel } from '../../src/model/columns.js';

interface Row {
  id: number;
  name: string;
  total: number;
  active: boolean;
  date: string;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'id', caption: 'ID' },
  { dataField: 'name', caption: 'Nama' },
  { dataField: 'total', caption: 'Total', dataType: 'number' },
  { dataField: 'active', caption: 'Aktif', dataType: 'boolean' },
  { dataField: 'date', caption: 'Tanggal', dataType: 'date' },
]);
const [ID, NAME, TOTAL, ACTIVE, DATE] = COLUMNS;

describe('cell renderer — cabang format', () => {
  it('number: currency, percent, precision, invalid, bigint', () => {
    expect(
      formatCellValue(12.5, {
        ...(TOTAL as never),
        format: { type: 'currency', currency: 'IDR', precision: 0 },
      }),
    ).toContain('IDR');
    expect(
      formatCellValue(0.25, {
        ...(TOTAL as never),
        format: { type: 'percent', precision: 1 },
      }),
    ).toContain('25');
    expect(
      formatCellValue(1.234, { ...(TOTAL as never), format: { precision: 1 } }),
    ).toMatch(/1[.,]2/);
    expect(formatCellValue('abc', TOTAL as never)).toBe('abc');
    expect(formatCellValue(12n, TOTAL as never)).toContain('12');
  });

  it('date: Date, number, valid string, invalid string', () => {
    expect(formatCellValue(new Date('2026-01-02'), DATE as never)).toContain(
      '2026',
    );
    expect(formatCellValue(0, DATE as never)).toContain('1970');
    expect(formatCellValue('2026-02-03', DATE as never)).toContain('2026');
    expect(formatCellValue('bukan tanggal', DATE as never)).toBe(
      'bukan tanggal',
    );
  });

  it('boolean, placeholder, string column', () => {
    expect(formatCellValue(true, ACTIVE as never)).toBe('Ya');
    expect(formatCellValue(false, ACTIVE as never)).toBe('Tidak');
    expect(formatCellValue(null, NAME as never)).toBe('—');
    expect(
      formatCellValue(undefined, NAME as never, { placeholder: 'N/A' }),
    ).toBe('N/A');
    expect(formatCellValue(7, NAME as never, { locale: 'id-ID' })).toBe('7');
  });

  it('cellValueFor/formatRowCell/setCellText', () => {
    const row: Row = {
      id: 1,
      name: 'Ani',
      total: 10,
      active: true,
      date: '2026-01-01',
    };
    expect(cellValueFor(row, ID as never)).toBe(1);
    expect(
      cellValueFor(row, { dataField: undefined } as never),
    ).toBeUndefined();
    expect(
      cellValueFor(row, {
        dataField: 'name',
        calculateCellValue: () => 'Hitung',
      } as never),
    ).toBe('Hitung');
    expect(formatRowCell(row, NAME as never)).toBe('Ani');

    const cell = document.createElement('div');
    setCellText(cell, 'A');
    setCellText(cell, 'A');
    expect(cell.textContent).toBe('A');
  });
});

describe('group view — cabang', () => {
  it('tanpa groupBy dan expanded Set/array', () => {
    const rows: Row[] = [
      { id: 1, name: 'Ani', total: 1, active: true, date: '2026-01-01' },
      { id: 2, name: 'Budi', total: 2, active: false, date: '2026-01-02' },
    ];
    expect(
      buildGroupEntries(rows, { columns: COLUMNS, keyOf: (row) => row.id }),
    ).toHaveLength(2);
    const grouped = buildGroupEntries(rows, {
      columns: COLUMNS,
      keyOf: (row) => row.id,
      groupBy: ['name'],
      expandedGroups: new Set<string>(),
    });
    expect(grouped[0]?.type).toBe('group');
    const expanded = buildGroupEntries(rows, {
      columns: COLUMNS,
      keyOf: (row) => row.id,
      groupBy: ['name'],
      expandedGroups: [],
    });
    expect(expanded[0]?.type).toBe('group');
  });

  it('label null dan caption fallback', () => {
    const entry = buildGroupEntries(
      [
        {
          id: 1,
          name: 'Ani',
          total: 1,
          active: true,
          date: '2026-01-01',
        },
      ],
      {
        columns: COLUMNS,
        keyOf: (row) => row.id,
        groupBy: ['name'],
      },
    )[0];
    if (!entry || entry.type !== 'group') throw new Error('bukan group');
    expect(groupCaption(entry.node, COLUMNS)).toBe('Nama');
    expect(groupLabel(entry.node, COLUMNS)).toContain('Ani');
  });
});

describe('column reorder — cabang', () => {
  it('moveColumn di tepi dan id tidak dikenal', () => {
    expect(moveColumn(['a', 'b'], 'a', -1)).toEqual(['a', 'b']);
    expect(moveColumn(['a', 'b'], 'b', 1)).toEqual(['a', 'b']);
    expect(moveColumn(['a', 'b'], 'x', 1)).toEqual(['a', 'b']);
    expect(moveColumn(['a', 'b'], 'a', 1)).toEqual(['b', 'a']);
  });

  it('moveColumnTo target tidak dikenal dan before/after', () => {
    expect(moveColumnTo(['a', 'b'], 'a', 'x', 'before')).toEqual(['a', 'b']);
    expect(moveColumnTo(['a', 'b', 'c'], 'a', 'b', 'after')).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(visibleColumnIds(COLUMNS)).toHaveLength(5);
  });
});
