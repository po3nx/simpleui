import { describe, expect, it, vi } from 'vitest';
import { createVirtualizer, Virtualizer } from './virtualizer.js';

const BASE = { itemCount: 100_000, itemSize: 32, viewportSize: 640 };

describe('Virtualizer — rentang', () => {
  it('menghitung rentang awal dengan overscan', () => {
    const virtualizer = new Virtualizer(BASE);

    expect(virtualizer.range).toEqual({
      start: 0,
      end: 24,
      totalSize: 3_200_000,
      offsetTop: 0,
    });
  });

  it('menggeser rentang saat scroll', () => {
    const virtualizer = new Virtualizer(BASE);
    virtualizer.setScrollOffset(3200);

    expect(virtualizer.range.start).toBe(97);
    expect(virtualizer.range.end).toBe(124);
    expect(virtualizer.range.offsetTop).toBe(97 * 32);
  });

  it('membatasi scroll pada akhir daftar', () => {
    const virtualizer = new Virtualizer(BASE);
    virtualizer.setScrollOffset(Number.MAX_SAFE_INTEGER);

    expect(virtualizer.scrollOffset).toBe(3_200_000 - 640);
    expect(virtualizer.range.end).toBe(100_000);
  });

  it('menangani daftar kosong', () => {
    const virtualizer = new Virtualizer({ ...BASE, itemCount: 0 });

    expect(virtualizer.range).toEqual({
      start: 0,
      end: 0,
      totalSize: 0,
      offsetTop: 0,
    });
  });

  it('mengubah rentang saat ukuran item dan viewport berubah', () => {
    const virtualizer = new Virtualizer(BASE);
    virtualizer.setItemSize(64);
    virtualizer.setViewportSize(1280);

    expect(virtualizer.range.start).toBe(0);
    expect(virtualizer.range.end).toBe(24);
  });

  it('menyesuaikan scroll saat jumlah item menyusut', () => {
    const virtualizer = new Virtualizer(BASE);
    virtualizer.setScrollOffset(3199 * 32);
    virtualizer.setItemCount(10);

    expect(virtualizer.scrollOffset).toBe(0);
    expect(virtualizer.range.end).toBe(10);
  });
});

describe('Virtualizer — pemetaan indeks', () => {
  it('memetakan offset ke indeks', () => {
    const virtualizer = new Virtualizer(BASE);

    expect(virtualizer.indexAt(0)).toBe(0);
    expect(virtualizer.indexAt(64)).toBe(2);
    expect(virtualizer.indexAt(-1)).toBeNull();
    expect(virtualizer.indexAt(3_200_000)).toBeNull();
  });

  it('memetakan indeks ke offset dan menolak indeks di luar daftar', () => {
    const virtualizer = new Virtualizer(BASE);

    expect(virtualizer.offsetOf(10)).toBe(320);
    expect(virtualizer.offsetOf(-1)).toBeNull();
    expect(virtualizer.offsetOf(100_000)).toBeNull();
    expect(virtualizer.offsetOf(1.5)).toBeNull();
  });

  it('menghitung scrollToIndex untuk tiap perataan', () => {
    const virtualizer = new Virtualizer(BASE);

    expect(virtualizer.scrollToIndex(100, 'start')).toBe(3200);
    expect(virtualizer.scrollToIndex(100, 'end')).toBe(3200 + 32 - 640);
    expect(virtualizer.scrollToIndex(100, 'center')).toBe(
      3200 - (640 - 32) / 2,
    );
    expect(virtualizer.scrollToIndex(-1)).toBe(0);
  });
});

describe('Virtualizer — perubahan dan validasi', () => {
  it('memberi tahu listener hanya saat rentang berubah', () => {
    const virtualizer = new Virtualizer(BASE);
    const listener = vi.fn();
    virtualizer.onChange(listener);

    virtualizer.setScrollOffset(1);
    expect(listener).not.toHaveBeenCalled();

    virtualizer.setScrollOffset(1000);
    expect(listener).toHaveBeenCalledTimes(1);

    const changed = listener.mock.calls[0]?.[0] as { start: number };
    expect(changed.start).toBe(28);
  });

  it('berhenti memberi tahu setelah unsubscribe atau dispose', () => {
    const virtualizer = new Virtualizer(BASE);
    const listener = vi.fn();
    const stop = virtualizer.onChange(listener);

    stop();
    virtualizer.setScrollOffset(1000);
    expect(listener).not.toHaveBeenCalled();

    virtualizer.onChange(listener);
    virtualizer.dispose();
    virtualizer.setScrollOffset(2000);
    expect(listener).not.toHaveBeenCalled();
  });

  it('menolak opsi tidak valid', () => {
    expect(() => new Virtualizer({ ...BASE, itemSize: 0 })).toThrowError(
      /SUI-CORE-001/,
    );
    expect(() => new Virtualizer({ ...BASE, itemCount: -1 })).toThrowError(
      /SUI-CORE-001/,
    );
  });

  it('createVirtualizer mengembalikan instance yang sama perilakunya', () => {
    const virtualizer = createVirtualizer(BASE);
    expect(virtualizer.range.end).toBe(24);
  });
});
