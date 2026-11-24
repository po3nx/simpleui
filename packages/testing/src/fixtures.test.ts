import { describe, expect, it } from 'vitest';
import {
  createColumns,
  createRowFactory,
  createRows,
  SECURITY_PAYLOADS,
} from './fixtures.js';

describe('createRows', () => {
  it('deterministik untuk seed yang sama', () => {
    expect(createRows({ seed: 'abc' })).toEqual(createRows({ seed: 'abc' }));
  });

  it('berbeda untuk seed berbeda', () => {
    expect(createRows({ seed: 'a' })).not.toEqual(createRows({ seed: 'b' }));
  });

  it('menghormati jumlah baris dan bentuk data', () => {
    const rows = createRows({ seed: 7, count: 3 });

    expect(rows).toHaveLength(3);
    for (const [index, row] of rows.entries()) {
      expect(row.id).toBe(index + 1);
      expect(typeof row.name).toBe('string');
      expect(row.age).toBeGreaterThanOrEqual(18);
      expect(row.age).toBeLessThanOrEqual(65);
      expect(typeof row.active).toBe('boolean');
      expect(typeof row.city).toBe('string');
    }
  });

  it('memakai default 10 baris', () => {
    expect(createRows()).toHaveLength(10);
  });
});

describe('createRowFactory', () => {
  it('mengembalikan baris yang sama untuk indeks sama', () => {
    const factory = createRowFactory({ seed: 'factory', count: 2 });

    expect(factory(0)).toEqual(factory(2));
    expect(factory(1)).toEqual(factory(3));
  });
});

describe('createColumns dan payload', () => {
  it('menyediakan kolom yang cocok dengan baris', () => {
    const fields = createColumns().map((column) => column.field);

    expect(fields).toEqual(['id', 'name', 'age', 'active', 'city']);
  });

  it('payload keamanan mencakup empat kategori', () => {
    expect(Object.keys(SECURITY_PAYLOADS).sort()).toEqual([
      'csv',
      'prototype',
      'url',
      'xss',
    ]);
  });
});
