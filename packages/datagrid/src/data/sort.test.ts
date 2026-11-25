import type { SortDescriptor } from '@simpleui/core';
import { describe, expect, it } from 'vitest';
import { DataGridError } from '../errors.js';
import { normalizeColumnModel } from '../model/columns.js';
import {
  applyGridSort,
  clearSort,
  nextSortDirection,
  sortDirectionFor,
  sortIndexFor,
  toggleSort,
} from './sort.js';

interface Row {
  name: string | null;
  total: number | null;
  city: string;
}

const rows: Row[] = [
  { name: 'Budi', total: 200, city: 'Jakarta' },
  { name: 'ani', total: null, city: 'Bandung' },
  { name: 'Citra', total: 100, city: 'Jakarta' },
  { name: null, total: 50, city: 'Bandung' },
];

const columns = normalizeColumnModel<Row>([
  { dataField: 'name' },
  { dataField: 'total', dataType: 'number' },
  { dataField: 'city' },
  { dataField: 'name', id: 'locked', allowSorting: false },
  {
    id: 'band',
    caption: 'Band',
    columns: [{ dataField: 'city', id: 'band-city' }],
  },
]);

describe('siklus arah sort', () => {
  it('mengikuti asc → desc → none', () => {
    expect(nextSortDirection(null)).toBe('asc');
    expect(nextSortDirection('asc')).toBe('desc');
    expect(nextSortDirection('desc')).toBeNull();
  });
});

describe('toggleSort — single', () => {
  it('mengganti arah pada kolom yang sama', () => {
    const asc = toggleSort(columns, [], 'name');
    expect(asc).toEqual([{ selector: 'name', desc: false }]);

    const desc = toggleSort(columns, asc, 'name');
    expect(desc).toEqual([{ selector: 'name', desc: true }]);

    expect(toggleSort(columns, desc, 'name')).toEqual([]);
  });

  it('mengganti kolom lain tanpa menyisakan descriptor lama', () => {
    const sortBy: SortDescriptor[] = [{ selector: 'name', desc: true }];
    expect(toggleSort(columns, sortBy, 'total')).toEqual([
      { selector: 'total', desc: false },
    ]);
  });
});

describe('toggleSort — multi', () => {
  it('menambah descriptor dan menjaga urutan', () => {
    const first = toggleSort(columns, [], 'city');
    const second = toggleSort(columns, first, 'total', { multi: true });

    expect(second).toEqual([
      { selector: 'city', desc: false },
      { selector: 'total', desc: false },
    ]);
  });

  it('mengubah arah di tempat dan menghapus hanya kolom itu', () => {
    const sortBy: SortDescriptor[] = [
      { selector: 'city', desc: false },
      { selector: 'name', desc: false },
    ];

    const second = toggleSort(columns, sortBy, 'name', { multi: true });
    expect(second).toEqual([
      { selector: 'city', desc: false },
      { selector: 'name', desc: true },
    ]);

    const removed = toggleSort(columns, second, 'name', { multi: true });
    expect(removed).toEqual([{ selector: 'city', desc: false }]);
  });
});

describe('toggleSort — validasi', () => {
  it('menolak kolom yang tidak dapat disortir', () => {
    expect(() => toggleSort(columns, [], 'locked')).toThrowError(DataGridError);
    expect(() => toggleSort(columns, [], 'band')).toThrowError(
      /tidak dapat disortir/,
    );
    expect(() => toggleSort(columns, [], 'tidak-ada')).toThrowError(
      /tidak ditemukan/,
    );
  });
});

describe('indikator sort', () => {
  const sortBy: SortDescriptor[] = [
    { selector: 'city', desc: false },
    { selector: 'name', desc: true },
  ];

  it('memberi posisi 1-based dan arah', () => {
    expect(sortIndexFor(sortBy, 'city')).toBe(1);
    expect(sortIndexFor(sortBy, 'name')).toBe(2);
    expect(sortIndexFor(sortBy, 'total')).toBe(0);
    expect(sortDirectionFor(sortBy, 'name')).toBe('desc');
    expect(sortDirectionFor(sortBy, 'total')).toBeUndefined();
  });

  it('clearSort mengosongkan', () => {
    expect(clearSort()).toEqual([]);
  });
});

describe('applyGridSort', () => {
  it('mengurutkan multi-kolom dengan collator case-insensitive', () => {
    const sorted = applyGridSort(rows, [
      { selector: 'city', desc: false },
      { selector: 'name', desc: false },
    ]);

    expect(sorted.map((row) => row.city)).toEqual([
      'Bandung',
      'Bandung',
      'Jakarta',
      'Jakarta',
    ]);
    expect(sorted.slice(0, 2).map((row) => row.name)).toEqual(['ani', null]);
  });

  it('selalu menaruh null di akhir, asc maupun desc', () => {
    const asc = applyGridSort(rows, [{ selector: 'total', desc: false }]);
    expect(asc.map((row) => row.total)).toEqual([50, 100, 200, null]);

    const desc = applyGridSort(rows, [{ selector: 'total', desc: true }]);
    expect(desc.map((row) => row.total)).toEqual([200, 100, 50, null]);
  });

  it('stabil dan tidak memutasi input', () => {
    const snapshot = [...rows];
    const sorted = applyGridSort(rows, [{ selector: 'city', desc: false }]);

    expect(rows).toEqual(snapshot);
    expect(sorted).not.toBe(rows);
  });

  it('tanpa sort mengembalikan baris yang sama', () => {
    expect(applyGridSort(rows, [])).toBe(rows);
  });
});
