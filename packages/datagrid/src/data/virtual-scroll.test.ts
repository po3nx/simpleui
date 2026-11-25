import { describe, expect, it } from 'vitest';
import { createVirtualScroll } from './virtual-scroll.js';

const MODEL = createVirtualScroll({
  rowCount: 1000,
  rowHeight: 32,
  viewportSize: 640,
  overscan: 3,
});

describe('virtual scroll — geometri', () => {
  it('menghitung tinggi total', () => {
    expect(MODEL.totalHeight).toBe(32_000);
    expect(MODEL.rowCount).toBe(1000);
  });

  it('menghitung rentang di awal', () => {
    expect(MODEL.range(0)).toEqual({
      start: 0,
      end: 24,
      totalSize: 32_000,
      offsetTop: 0,
    });
  });

  it('menggeser rentang saat scroll', () => {
    const range = MODEL.range(3200);
    expect(range.start).toBe(97);
    expect(range.end).toBe(124);
    expect(range.offsetTop).toBe(97 * 32);
  });

  it('membatasi rentang di akhir daftar', () => {
    const range = MODEL.range(Number.MAX_SAFE_INTEGER);
    expect(range.end).toBe(1000);
  });
});

describe('virtual scroll — pemetaan', () => {
  it('memetakan offset ke indeks baris', () => {
    expect(MODEL.rowAtOffset(0)).toBe(0);
    expect(MODEL.rowAtOffset(64)).toBe(2);
    expect(MODEL.rowAtOffset(-1)).toBeNull();
    expect(MODEL.rowAtOffset(32_000)).toBeNull();
  });

  it('menghitung offset untuk baris dan perataan', () => {
    expect(MODEL.offsetForRow(100)).toBe(3200);
    expect(MODEL.offsetForRow(100, 'end')).toBe(3200 + 32 - 640);
    expect(MODEL.offsetForRow(100, 'center')).toBe(3200 - (640 - 32) / 2);
  });

  it('menghitung offset awal halaman', () => {
    expect(MODEL.offsetForPage(2, 20)).toBe(40 * 32);
    expect(MODEL.offsetForPage(999, 20)).toBe(31_360);
  });
});

describe('virtual scroll — konfigurasi', () => {
  it('overscan 0 memperkecil rentang', () => {
    const noOverscan = createVirtualScroll({
      rowCount: 1000,
      rowHeight: 32,
      viewportSize: 640,
      overscan: 0,
    });

    expect(noOverscan.range(0).end).toBe(21);
  });

  it('menyesuaikan jumlah baris yang dirender dengan viewport', () => {
    const tall = createVirtualScroll({
      rowCount: 1000,
      rowHeight: 32,
      viewportSize: 800,
    });

    expect(tall.range(0).end).toBe(26 + 3);
  });
});
