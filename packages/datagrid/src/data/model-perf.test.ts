import { ArrayStore } from '@simpleui/core';
import { describe, expect, it } from 'vitest';
import { applyGridFilter } from './filter.js';
import { groupRows } from './grouping.js';
import { pageRange } from './paging.js';
import { applyGridSort } from './sort.js';

/**
 * Bukti gate G-DG1: model DataGrid memuat dan memproses 100.000 baris dalam
 * budget docs/00 §8.2 (filter ≤ 100 ms, sort ≤ 150 ms) dengan margin CI.
 */

const ROW_COUNT = 100_000;
const CITIES = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Makassar'];

interface Row {
  id: number;
  name: string;
  city: string;
  total: number;
}

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `Nama ${String(index % 1000).padStart(4, '0')}`,
    city: CITIES[index % CITIES.length] as string,
    total: (index * 37) % 10_000,
  }));
}

function measure(fn: () => void): number {
  const started = performance.now();
  fn();
  return performance.now() - started;
}

// Perf tidak dijalankan saat pengukuran coverage: instrumentasi v8 membuat
// waktu tidak representatif (sort bisa 5x lebih lambat).
describe.skipIf(process.env['SKIP_PERF'] === '1')('model 100k baris', () => {
  const rows = buildRows(ROW_COUNT);

  it('memuat 100k baris dari ArrayStore dengan totalCount benar', async () => {
    const store = new ArrayStore(rows, { key: 'id' });
    const started = performance.now();
    const result = await store.load({ skip: 0, take: 100 });
    const elapsed = performance.now() - started;

    expect(result.totalCount).toBe(ROW_COUNT);
    expect(result.data).toHaveLength(100);
    console.log(`model 100k: load 100 baris ${elapsed.toFixed(1)} ms`);
    expect(elapsed).toBeLessThan(500);
  });

  it('memfilter 100k baris dalam budget', () => {
    const elapsed = measure(() => {
      const filtered = applyGridFilter(rows, ['name', 'contains', 'Nama 01']);
      expect(filtered.length).toBeGreaterThan(0);
    });

    console.log(`model 100k: filter ${elapsed.toFixed(1)} ms`);
    // Budget docs 100 ms (terukur ~12 ms setelah cache locale collator).
    expect(elapsed).toBeLessThan(100);
  });

  it('menyortir 100k baris multi-kolom dalam budget', () => {
    const elapsed = measure(() => {
      const sorted = applyGridSort(rows, [
        { selector: 'city', desc: false },
        { selector: 'total', desc: true },
      ]);
      expect(sorted).toHaveLength(ROW_COUNT);
    });

    console.log(`model 100k: sort ${elapsed.toFixed(1)} ms`);
    // Budget docs 150 ms; sedikit margin untuk variasi runner CI.
    expect(elapsed).toBeLessThan(175);
  });

  it('mengelompokkan 100k baris dalam batas grup', () => {
    const elapsed = measure(() => {
      const groups = groupRows(rows, ['city', 'total'], {
        maxGroupCount: 10_000,
      });
      expect(groups).toHaveLength(CITIES.length);
    });

    console.log(`model 100k: group (2 level) ${elapsed.toFixed(1)} ms`);
    expect(elapsed).toBeLessThan(750);
  });

  it('menghitung rentang halaman tanpa memuat data', () => {
    expect(pageRange(ROW_COUNT, 50, 20)).toEqual({
      start: 1000,
      end: 1020,
    });
    expect(pageRange(ROW_COUNT, 4999, 20)).toEqual({
      start: 99_980,
      end: 100_000,
    });
  });
});
