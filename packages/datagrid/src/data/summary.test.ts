import { describe, expect, it, vi } from 'vitest';
import type { SummaryItem } from '../api/types.js';
import { DataGridError } from '../errors.js';
import { normalizeColumnModel } from '../model/columns.js';
import { groupRows } from './grouping.js';
import {
  computeGroupSummary,
  computeSummary,
  formatSummary,
} from './summary.js';

interface Sale {
  city: string;
  amount: number | null;
  qty: number;
}

const ROWS: Sale[] = [
  { city: 'Jakarta', amount: 100, qty: 2 },
  { city: 'Bandung', amount: 50, qty: 5 },
  { city: 'Jakarta', amount: null, qty: 3 },
  { city: 'Jakarta', amount: 150, qty: 1 },
];

const COLUMNS = normalizeColumnModel<Sale>([
  { dataField: 'city', id: 'city' },
  { dataField: 'amount', id: 'amount-col', dataType: 'number' },
  { dataField: 'qty', id: 'qty-col', dataType: 'number' },
]);

const ITEMS: SummaryItem<Sale>[] = [
  { column: 'amount-col', summaryType: 'sum' },
  { column: 'qty-col', summaryType: 'count' },
];

describe('computeSummary', () => {
  it('menghitung sum/avg/count/max dan memetakan id ke dataField', () => {
    expect(computeSummary(ROWS, { columns: COLUMNS, items: ITEMS })).toEqual({
      'amount-col': 300,
      'qty-col': 4,
    });
  });

  it('menghitung avg dan max terpisah', () => {
    const sum = computeSummary(ROWS, {
      columns: COLUMNS,
      items: [{ column: 'amount-col', summaryType: 'avg' }],
    });
    expect(sum['amount-col']).toBe(100);

    const max = computeSummary(ROWS, {
      columns: COLUMNS,
      items: [{ column: 'qty-col', summaryType: 'max' }],
    });
    expect(max['qty-col']).toBe(5);
  });

  it('mengabaikan nilai non-numerik dan null', () => {
    const result = computeSummary(ROWS, {
      columns: COLUMNS,
      items: [{ column: 'qty-col', summaryType: 'min' }],
    });
    expect(result['qty-col']).toBe(1);
  });

  it('memberi 0 untuk data kosong', () => {
    const result = computeSummary([], { columns: COLUMNS, items: ITEMS });
    expect(result['amount-col']).toBe(0);
    expect(result['qty-col']).toBe(0);
  });

  it('menolak kolom tidak dikenal dengan SUI-DG-001', () => {
    expect(() =>
      computeSummary(ROWS, {
        columns: COLUMNS,
        items: [{ column: 'tidak-ada', summaryType: 'sum' }],
      }),
    ).toThrowError(DataGridError);
  });

  it('tidak memutasi data', () => {
    const snapshot = JSON.stringify(ROWS);
    computeSummary(ROWS, { columns: COLUMNS, items: ITEMS });
    expect(JSON.stringify(ROWS)).toBe(snapshot);
  });
});

describe('computeGroupSummary', () => {
  it('menghitung summary per grup dan grup anak', () => {
    const groups = groupRows(ROWS, ['city']);
    const totals = computeGroupSummary(groups, {
      columns: COLUMNS,
      items: [{ column: 'amount-col', summaryType: 'sum' }],
    });

    expect(groups).toHaveLength(2);
    const jakarta = groups[0];
    const bandung = groups[1];
    expect(jakarta).toBeDefined();
    expect(bandung).toBeDefined();
    expect(totals.get(jakarta?.key ?? '')?.['amount-col']).toBe(250);
    expect(totals.get(bandung?.key ?? '')?.['amount-col']).toBe(50);
  });

  it('mencakup grup anak pada grouping multi-level', () => {
    const groups = groupRows(ROWS, ['city', 'qty']);
    const totals = computeGroupSummary(groups, {
      columns: COLUMNS,
      items: [{ column: 'qty-col', summaryType: 'count' }],
    });

    // 2 grup kota + 4 grup qty anak (Jakarta 3, Bandung 1).
    expect([...totals.keys()]).toHaveLength(groups.length + 4);
    expect([...totals.values()].some((value) => value['qty-col'] === 3)).toBe(
      true,
    );
  });
});

describe('formatSummary', () => {
  it('memformat angka sesuai locale', () => {
    const item: SummaryItem<Sale> = {
      column: 'amount-col',
      summaryType: 'sum',
    };

    expect(formatSummary(item, { value: 1234.5, data: ROWS })).toBe('1,234.5');
    expect(
      formatSummary(item, { value: 1234.5, data: ROWS, locale: 'id-ID' }),
    ).toBe('1.234,5');
  });

  it('menerapkan displayFormat', () => {
    const item: SummaryItem<Sale> = {
      column: 'amount-col',
      summaryType: 'sum',
      displayFormat: 'Total: {0}',
    };

    expect(formatSummary(item, { value: 300, data: ROWS })).toBe('Total: 300');
  });

  it('memakai customizeText dan meneruskan data', () => {
    const customizeText = vi.fn(
      ({ value }: { value: unknown }) => `${String(value)} unit`,
    );
    const item: SummaryItem<Sale> = {
      column: 'qty-col',
      summaryType: 'sum',
      customizeText,
    };

    expect(formatSummary(item, { value: 11, data: ROWS })).toBe('11 unit');
    expect(customizeText).toHaveBeenCalledWith({ value: 11, data: ROWS });
  });

  it('mengembalikan em dash dan melapor bila formatter melempar', () => {
    const onError = vi.fn();
    const item: SummaryItem<Sale> = {
      column: 'qty-col',
      summaryType: 'sum',
      customizeText: () => {
        throw new Error('boom');
      },
    };

    expect(formatSummary(item, { value: 1, data: ROWS, onError })).toBe('—');
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
