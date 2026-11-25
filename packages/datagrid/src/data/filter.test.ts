import type { FilterExpression } from '@simpleui/core';
import { describe, expect, it } from 'vitest';
import { DataGridError } from '../errors.js';
import { normalizeColumnModel } from '../model/columns.js';
import {
  applyGridFilter,
  buildFilterCondition,
  buildFilterRow,
  buildSearchFilter,
  defaultOperatorForType,
  isOperatorAllowed,
  MAX_SEARCH_LENGTH,
  operatorsForType,
  validateGridFilter,
} from './filter.js';

interface Row {
  id: number;
  name: string;
  total: number;
  active: boolean;
}

const ROWS: Row[] = [
  { id: 1, name: 'Budi', total: 100, active: true },
  { id: 2, name: 'Ani', total: 250, active: false },
  { id: 3, name: 'Citra', total: 50, active: true },
];

const columns = normalizeColumnModel<Row>([
  { dataField: 'name' },
  { dataField: 'total', dataType: 'number' },
  { dataField: 'active', dataType: 'boolean' },
]);

describe('operator per tipe', () => {
  it('menyediakan operator sesuai tipe', () => {
    expect(operatorsForType('string')).toContain('contains');
    expect(operatorsForType('number')).not.toContain('contains');
    expect(operatorsForType('number')).toContain('between');
    expect(operatorsForType('boolean')).toEqual([
      'eq',
      'neq',
      'isNull',
      'isNotNull',
    ]);
    expect(isOperatorAllowed('string', 'contains')).toBe(true);
    expect(isOperatorAllowed('boolean', 'gt')).toBe(false);
  });

  it('memilih operator default', () => {
    expect(defaultOperatorForType('string')).toBe('contains');
    expect(defaultOperatorForType('number')).toBe('eq');
  });
});

describe('buildFilterCondition', () => {
  it('membangun kondisi sederhana dan null check', () => {
    expect(buildFilterCondition('total', 'eq', 'number', 10)).toEqual([
      'total',
      'eq',
      10,
    ]);
    expect(buildFilterCondition('name', 'isNull', 'string', undefined)).toEqual(
      ['name', 'isNull'],
    );
  });

  it('memangkas spasi pada operator teks', () => {
    expect(
      buildFilterCondition('name', 'contains', 'string', '  bu  '),
    ).toEqual(['name', 'contains', 'bu']);
  });

  it('menolak operator yang tidak cocok dengan tipe', () => {
    expect(() =>
      buildFilterCondition('total', 'contains', 'number', '1'),
    ).toThrowError(/tidak didukung/);
  });

  it('memvalidasi operand in, between, dan teks', () => {
    expect(() =>
      buildFilterCondition('total', 'in', 'number', []),
    ).toThrowError(/array tidak kosong/);
    expect(() =>
      buildFilterCondition(
        'total',
        'in',
        'number',
        Array.from({ length: 1001 }, (_, i) => i),
      ),
    ).toThrowError(/maksimum/);
    expect(() =>
      buildFilterCondition('total', 'in', 'number', [{}]),
    ).toThrowError(/string, number, atau boolean/);
    expect(() =>
      buildFilterCondition('total', 'between', 'number', [1]),
    ).toThrowError(/tepat 2/);
    expect(() =>
      buildFilterCondition('name', 'contains', 'string', '   '),
    ).toThrowError(/tidak boleh kosong/);
  });

  it('tidak memutasi array nilai', () => {
    const values = [1, 2];
    buildFilterCondition('total', 'in', 'number', values);
    expect(values).toEqual([1, 2]);
  });
});

describe('buildFilterRow', () => {
  it('mengembalikan null untuk input kosong', () => {
    expect(buildFilterRow(columns, {})).toBeNull();
    expect(buildFilterRow(columns, { name: { value: '   ' } })).toBeNull();
  });

  it('menggabungkan beberapa kondisi dengan AND', () => {
    const filter = buildFilterRow(columns, {
      name: { value: 'bu' },
      active: { value: true },
    });

    expect(filter).toEqual([
      'and',
      ['name', 'contains', 'bu'],
      ['active', 'eq', true],
    ]);
  });

  it('mempertahankan nilai false dan 0', () => {
    const filter = buildFilterRow(columns, {
      active: { value: false },
      total: { value: 0 },
    });

    expect(filter).toEqual([
      'and',
      ['total', 'eq', 0],
      ['active', 'eq', false],
    ]);
  });
});

describe('buildSearchFilter', () => {
  it('mengembalikan null untuk kueri kosong', () => {
    expect(buildSearchFilter(['name'], '  ')).toBeNull();
    expect(buildSearchFilter([], 'budi')).toBeNull();
  });

  it('membangun OR untuk banyak field dan memangkas spasi', () => {
    expect(buildSearchFilter(['name', 'total'], '  bu  ')).toEqual([
      'or',
      ['name', 'contains', 'bu'],
      ['total', 'contains', 'bu'],
    ]);
  });

  it('menolak kueri terlalu panjang', () => {
    expect(() =>
      buildSearchFilter(['name'], 'a'.repeat(MAX_SEARCH_LENGTH + 1)),
    ).toThrowError(/maksimum/);
  });
});

describe('applyGridFilter', () => {
  it('mengembalikan baris yang sama tanpa filter', () => {
    expect(applyGridFilter(ROWS, null)).toBe(ROWS);
  });

  it('memfilter teks case-insensitive dan angka', () => {
    expect(
      applyGridFilter(ROWS, ['name', 'contains', 'an']).map((row) => row.id),
    ).toEqual([2]);

    expect(
      applyGridFilter(ROWS, ['total', 'between', [60, 200]]).map(
        (row) => row.id,
      ),
    ).toEqual([1]);

    expect(
      applyGridFilter(ROWS, ['total', 'in', [50, 100]]).map((row) => row.id),
    ).toEqual([1, 3]);
  });

  it('menangani grup AND/OR', () => {
    const filter: FilterExpression = [
      'and',
      ['active', 'eq', true],
      ['or', ['name', 'contains', 'bu'], ['name', 'contains', 'cit']],
    ];

    expect(applyGridFilter(ROWS, filter).map((row) => row.id)).toEqual([1, 3]);
  });
});

describe('validateGridFilter', () => {
  it('menerima filter valid', () => {
    expect(() => validateGridFilter(['name', 'contains', 'a'])).not.toThrow();
  });

  it('membungkus pelanggaran batas menjadi SUI-DG-001', () => {
    let nested: FilterExpression = ['name', 'eq', 'a'];
    for (let index = 0; index < 12; index += 1) {
      nested = ['not', nested];
    }

    try {
      validateGridFilter(nested);
      expect.unreachable('harus melempar');
    } catch (error) {
      expect(error).toBeInstanceOf(DataGridError);
      expect((error as DataGridError).code).toBe('SUI-DG-001');
    }
  });
});
