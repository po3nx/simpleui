import { describe, expect, it } from 'vitest';
import type { ColumnOptions } from '../api/types.js';
import { normalizeColumnModel } from '../model/columns.js';
import {
  cellValueFor,
  DEFAULT_EMPTY_TEXT,
  formatCellValue,
  formatRowCell,
} from './cell-renderer.js';

interface Row {
  id: number;
  name: string;
  born: string;
}

function column(options: ColumnOptions<Row>) {
  const model = normalizeColumnModel<Row>([options]);
  return model[0] as NonNullable<(typeof model)[0]>;
}

const STRING = column({ dataField: 'name', dataType: 'string' });

describe('formatCellValue — null dan placeholder', () => {
  it('null/undefined menjadi placeholder default', () => {
    expect(formatCellValue(null, STRING)).toBe(DEFAULT_EMPTY_TEXT);
    expect(formatCellValue(undefined, STRING)).toBe(DEFAULT_EMPTY_TEXT);
  });

  it('placeholder dapat diganti', () => {
    expect(formatCellValue(null, STRING, { placeholder: 'kosong' })).toBe(
      'kosong',
    );
  });

  it('string kosong tetap kosong', () => {
    expect(formatCellValue('', STRING)).toBe('');
  });
});

describe('formatCellValue — angka', () => {
  const number = column({ dataField: 'id', dataType: 'number' });

  it('memakai grouping locale', () => {
    expect(formatCellValue(1234.5, number)).toBe('1,234.5');
    expect(formatCellValue(1234.5, number, { locale: 'id-ID' })).toBe(
      '1.234,5',
    );
  });

  it('menghormati precision desimal', () => {
    const decimal = column({
      dataField: 'id',
      dataType: 'number',
      format: { type: 'decimal', precision: 2 },
    });
    expect(formatCellValue(1.5, decimal)).toBe('1.50');
  });

  it('memformat persen dan mata uang', () => {
    const percent = column({
      dataField: 'id',
      dataType: 'number',
      format: { type: 'percent' },
    });
    const currency = column({
      dataField: 'id',
      dataType: 'number',
      format: { type: 'currency', currency: 'USD' },
    });

    expect(formatCellValue(0.25, percent)).toBe('25%');
    expect(formatCellValue(1234.5, currency)).toBe('$1,234.50');
  });

  it('nilai non-numerik dikembalikan apa adanya', () => {
    expect(formatCellValue('abc', number)).toBe('abc');
  });
});

describe('formatCellValue — tanggal dan boolean', () => {
  const date = column({ dataField: 'born', dataType: 'date' });

  it('memformat ISO date sesuai locale', () => {
    expect(
      formatCellValue('2026-01-15T00:00:00.000Z', date, { locale: 'en-US' }),
    ).toBe('Jan 15, 2026');
  });

  it('tanggal tidak valid dikembalikan apa adanya', () => {
    expect(formatCellValue('bukan tanggal', date)).toBe('bukan tanggal');
  });

  it('boolean menjadi Ya/Tidak', () => {
    const flag = column({ dataField: 'id', dataType: 'boolean' });
    expect(formatCellValue(true, flag)).toBe('Ya');
    expect(formatCellValue(false, flag)).toBe('Tidak');
  });
});

describe('nilai baris dan kalkulasi', () => {
  it('memakai dataField', () => {
    const row: Row = { id: 1, name: 'Ani', born: '' };
    expect(cellValueFor(row, STRING)).toBe('Ani');
  });

  it('calculateCellValue menang atas dataField', () => {
    const computed = column({
      dataField: 'name',
      dataType: 'string',
      calculateCellValue: (row) => `${row.name.toUpperCase()}!`,
    });
    const row: Row = { id: 1, name: 'Ani', born: '' };

    expect(cellValueFor(row, computed)).toBe('ANI!');
    expect(formatRowCell(row, computed)).toBe('ANI!');
  });

  it('kolom tanpa dataField menghasilkan placeholder', () => {
    const empty = column({ id: 'x' });
    expect(formatRowCell({ id: 1, name: 'A', born: '' }, empty)).toBe(
      DEFAULT_EMPTY_TEXT,
    );
  });
});
