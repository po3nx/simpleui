import { describe, expect, it } from 'vitest';
import {
  applyFilter,
  applyPage,
  applySort,
  MAX_TAKE,
  normalizeOptions,
  runQuery,
  summarize,
  validateFilter,
} from './query.js';
import type { FilterExpression } from './types.js';

interface Row {
  id: number;
  name: string;
  age: number | null;
}

const collator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
});

const rows: Row[] = [
  { id: 1, name: 'Budi', age: 30 },
  { id: 2, name: 'Ani', age: 25 },
  { id: 3, name: 'Citra', age: null },
];

const ids = (result: readonly Row[]): number[] => result.map((row) => row.id);

describe('normalizeOptions', () => {
  it('memberi nilai default', () => {
    expect(normalizeOptions({})).toEqual({
      skip: 0,
      take: undefined,
      sort: [],
      filter: undefined,
    });
  });

  it('menolak skip negatif dan take tidak valid', () => {
    expect(() => normalizeOptions({ skip: -1 })).toThrowError(/SUI-DATA-001/);
    expect(() => normalizeOptions({ take: 0 })).toThrowError(/SUI-DATA-001/);
  });

  it('menolak take melebihi batas', () => {
    expect(() => normalizeOptions({ take: MAX_TAKE + 1 })).toThrowError(
      /SUI-DATA-006/,
    );
  });

  it('menolak selector sort kosong', () => {
    expect(() =>
      normalizeOptions({ sort: [{ selector: '', desc: false }] }),
    ).toThrowError(/SUI-DATA-001/);
  });
});

describe('validateFilter', () => {
  it('menolak filter terlalu dalam', () => {
    let expression: FilterExpression = ['id', 'eq', 1];
    for (let index = 0; index < 12; index += 1) {
      expression = ['not', expression] as const;
    }
    expect(() => validateFilter(expression)).toThrowError(/SUI-DATA-007/);
  });

  it('menolak operator tak dikenal dari data runtime', () => {
    const invalid = ['id', 'regex', 'x'] as unknown as FilterExpression;
    expect(() => validateFilter(invalid)).toThrowError(/SUI-DATA-007/);
  });

  it('menolak daftar in yang terlalu panjang', () => {
    const invalid = [
      'id',
      'in',
      Array.from({ length: 1001 }, (_value, index) => index),
    ] as unknown as FilterExpression;
    expect(() => validateFilter(invalid)).toThrowError(/SUI-DATA-007/);
  });
});

describe('applyFilter', () => {
  it('mendukung operator perbandingan', () => {
    expect(ids(applyFilter(rows, ['age', 'gt', 25], collator))).toEqual([1]);
    expect(ids(applyFilter(rows, ['id', 'between', [2, 3]], collator))).toEqual(
      [2, 3],
    );
  });

  it('mendukung operator teks dengan collator', () => {
    expect(ids(applyFilter(rows, ['name', 'eq', 'ani'], collator))).toEqual([
      2,
    ]);
    expect(
      ids(applyFilter(rows, ['name', 'startsWith', 'bu'], collator)),
    ).toEqual([1]);
  });

  it('mendukung in/notIn dan isNull', () => {
    expect(ids(applyFilter(rows, ['id', 'in', [1, 3]], collator))).toEqual([
      1, 3,
    ]);
    expect(ids(applyFilter(rows, ['age', 'isNull'], collator))).toEqual([3]);
    expect(ids(applyFilter(rows, ['age', 'isNotNull'], collator))).toEqual([
      1, 2,
    ]);
  });

  it('mendukung and/or/not', () => {
    const expression: FilterExpression = [
      'and',
      ['id', 'gt', 0],
      ['or', ['name', 'eq', 'Budi'], ['name', 'eq', 'Citra']],
    ];
    expect(ids(applyFilter(rows, expression, collator))).toEqual([1, 3]);

    const negated: FilterExpression = ['not', ['id', 'eq', 1]];
    expect(ids(applyFilter(rows, negated, collator))).toEqual([2, 3]);
  });

  it('mengembalikan semua baris tanpa filter', () => {
    expect(applyFilter(rows, undefined, collator)).toBe(rows);
  });
});

describe('applySort dan applyPage', () => {
  it('mengurutkan angka dan menempatkan null di akhir', () => {
    expect(
      ids(applySort(rows, [{ selector: 'age', desc: true }], collator)),
    ).toEqual([1, 2, 3]);
  });

  it('mengurutkan teks dengan collator', () => {
    expect(
      ids(applySort(rows, [{ selector: 'name', desc: false }], collator)),
    ).toEqual([2, 1, 3]);
  });

  it('memotong sesuai skip/take', () => {
    expect(applyPage([1, 2, 3, 4], 1, 2)).toEqual([2, 3]);
    expect(applyPage([1, 2, 3, 4], 2, undefined)).toEqual([3, 4]);
  });
});

describe('summarize', () => {
  it('menghitung agregasi numerik dan mengabaikan null/non-finite', () => {
    expect(summarize(rows, 'age', 'sum')).toBe(55);
    expect(summarize(rows, 'age', 'avg')).toBe(27.5);
    expect(summarize(rows, 'age', 'min')).toBe(25);
    expect(summarize(rows, 'age', 'max')).toBe(30);
    expect(summarize(rows, 'age', 'count')).toBe(3);
  });

  it('mengembalikan 0 bila tidak ada nilai numerik', () => {
    expect(summarize([{ id: 1, name: 'x', age: null }], 'age', 'sum')).toBe(0);
  });
});

describe('runQuery', () => {
  it('menjalankan filter, sort, page, dan total count sebelum page', () => {
    const result = runQuery(
      rows,
      {
        filter: ['id', 'gte', 1],
        sort: [{ selector: 'id', desc: true }],
        skip: 1,
        take: 1,
      },
      collator,
    );

    expect(result.data.map((row) => row.id)).toEqual([2]);
    expect(result.totalCount).toBe(3);
  });
});
