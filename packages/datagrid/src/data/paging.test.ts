import { describe, expect, it } from 'vitest';
import {
  clampPageIndex,
  createPageInfo,
  hasNextPage,
  pageCountFor,
  pageForRowIndex,
  pageRange,
  skipForPage,
} from './paging.js';

describe('paging — jumlah halaman', () => {
  it('menghitung halaman untuk data kosong, pas, dan sisa', () => {
    expect(pageCountFor(0, 20)).toBe(0);
    expect(pageCountFor(20, 20)).toBe(1);
    expect(pageCountFor(21, 20)).toBe(2);
    expect(pageCountFor(45, 20)).toBe(3);
    expect(pageCountFor(10, 0)).toBe(0);
  });

  it('menghitung skip dari halaman', () => {
    expect(skipForPage(0, 20)).toBe(0);
    expect(skipForPage(3, 50)).toBe(150);
    expect(skipForPage(-2, 20)).toBe(0);
  });
});

describe('paging — clamp dan rentang', () => {
  it('menjepit halaman ke rentang valid', () => {
    expect(clampPageIndex(5, 45, 20)).toBe(2);
    expect(clampPageIndex(-1, 45, 20)).toBe(0);
    expect(clampPageIndex(0, 0, 20)).toBe(0);
  });

  it('menentukan halaman dari indeks baris', () => {
    expect(pageForRowIndex(0, 20)).toBe(0);
    expect(pageForRowIndex(19, 20)).toBe(0);
    expect(pageForRowIndex(20, 20)).toBe(1);
    expect(pageForRowIndex(-1, 20)).toBe(0);
  });

  it('memberi rentang baris per halaman', () => {
    expect(pageRange(45, 0, 20)).toEqual({ start: 0, end: 20 });
    expect(pageRange(45, 2, 20)).toEqual({ start: 40, end: 45 });
    expect(pageRange(0, 0, 20)).toEqual({ start: 0, end: 0 });
  });
});

describe('paging — info dan navigasi', () => {
  it('membangun info halaman yang konsisten', () => {
    expect(createPageInfo(45, 1, 20)).toEqual({
      pageIndex: 1,
      pageSize: 20,
      skip: 20,
      take: 20,
      pageCount: 3,
    });
  });

  it('mengetahui apakah ada halaman berikutnya', () => {
    expect(hasNextPage(45, 0, 20)).toBe(true);
    expect(hasNextPage(45, 2, 20)).toBe(false);
    expect(hasNextPage(0, 0, 20)).toBe(false);
  });
});
