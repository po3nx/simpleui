import { SimpleUIError } from '../kernel/errors.js';

/**
 * Virtualizer baris (FND-019, docs/01-arsitektur.md §5, R-PERF-05).
 *
 * Matematika murni tanpa DOM: mengambil rentang item yang perlu dirender dari
 * posisi scroll, dengan overscan dan batas. Dirancang agar satu pembaruan
 * scroll jauh di bawah budget frame 16 ms.
 */

export interface VirtualizerOptions {
  readonly itemCount: number;
  /** Tinggi/lebar tetap per item (px). */
  readonly itemSize: number;
  /** Ukuran viewport (px). */
  readonly viewportSize: number;
  /** Item tambahan di luar viewport; default 3. */
  readonly overscan?: number;
}

export interface VirtualRange {
  /** Indeks awal, inklusif. */
  readonly start: number;
  /** Indeks akhir, eksklusif. */
  readonly end: number;
  /** Ukuran total semua item (px). */
  readonly totalSize: number;
  /** Offset item pertama relatif terhadap awal daftar (px). */
  readonly offsetTop: number;
}

export type VirtualAlign = 'start' | 'center' | 'end';

type RangeListener = (range: VirtualRange) => void;

function assertNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new SimpleUIError(
      'SUI-CORE-001',
      `${name} harus angka >= 0 (diterima: ${value}).`,
    );
  }
}

function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new SimpleUIError(
      'SUI-CORE-001',
      `${name} harus angka > 0 (diterima: ${value}).`,
    );
  }
}

export class Virtualizer {
  #itemCount: number;
  #itemSize: number;
  #viewportSize: number;
  #overscan: number;
  #scrollOffset = 0;
  #range: VirtualRange = { start: 0, end: 0, totalSize: 0, offsetTop: 0 };
  readonly #listeners = new Set<RangeListener>();
  #disposed = false;

  constructor(options: VirtualizerOptions) {
    assertNonNegative(options.itemCount, 'itemCount');
    assertPositive(options.itemSize, 'itemSize');
    assertNonNegative(options.viewportSize, 'viewportSize');

    this.#itemCount = Math.floor(options.itemCount);
    this.#itemSize = options.itemSize;
    this.#viewportSize = options.viewportSize;
    this.#overscan = Math.max(0, Math.floor(options.overscan ?? 3));
    this.#range = this.#computeRange();
  }

  get itemCount(): number {
    return this.#itemCount;
  }

  get itemSize(): number {
    return this.#itemSize;
  }

  get viewportSize(): number {
    return this.#viewportSize;
  }

  get scrollOffset(): number {
    return this.#scrollOffset;
  }

  get range(): VirtualRange {
    return this.#range;
  }

  setItemCount(count: number): void {
    assertNonNegative(count, 'itemCount');
    this.#itemCount = Math.floor(count);
    this.#scrollOffset = this.#clampOffset(this.#scrollOffset);
    this.#update();
  }

  setItemSize(size: number): void {
    assertPositive(size, 'itemSize');
    this.#itemSize = size;
    this.#scrollOffset = this.#clampOffset(this.#scrollOffset);
    this.#update();
  }

  setViewportSize(size: number): void {
    assertNonNegative(size, 'viewportSize');
    this.#viewportSize = size;
    this.#update();
  }

  setOverscan(count: number): void {
    assertNonNegative(count, 'overscan');
    this.#overscan = Math.floor(count);
    this.#update();
  }

  setScrollOffset(offset: number): void {
    assertNonNegative(offset, 'scrollOffset');
    const clamped = this.#clampOffset(offset);
    if (clamped === this.#scrollOffset) return;

    this.#scrollOffset = clamped;
    this.#update();
  }

  /** Indeks item pada offset tertentu, atau `null` di luar rentang. */
  indexAt(offset: number): number | null {
    if (offset < 0 || offset >= this.#totalSize()) return null;
    const index = Math.floor(offset / this.#itemSize);
    return index < this.#itemCount ? index : null;
  }

  /** Offset awal item; `null` bila indeks di luar daftar. */
  offsetOf(index: number): number | null {
    if (!Number.isInteger(index) || index < 0 || index >= this.#itemCount) {
      return null;
    }
    return index * this.#itemSize;
  }

  /** Offset scroll yang dibutuhkan agar item terlihat, tanpa mengubah state. */
  scrollToIndex(index: number, align: VirtualAlign = 'start'): number {
    const offset = this.offsetOf(index);
    if (offset === null) return this.#scrollOffset;

    if (align === 'start') return this.#clampOffset(offset);
    if (align === 'end') {
      return this.#clampOffset(offset + this.#itemSize - this.#viewportSize);
    }

    const centered = offset - (this.#viewportSize - this.#itemSize) / 2;
    return this.#clampOffset(centered);
  }

  /** Dengarkan perubahan rentang; mengembalikan fungsi berhenti. */
  onChange(listener: RangeListener): () => void {
    if (this.#disposed) return () => {};
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  dispose(): void {
    this.#disposed = true;
    this.#listeners.clear();
  }

  #totalSize(): number {
    return this.#itemCount * this.#itemSize;
  }

  #clampOffset(offset: number): number {
    const maxOffset = Math.max(0, this.#totalSize() - this.#viewportSize);
    return Math.min(Math.max(offset, 0), maxOffset);
  }

  #computeRange(): VirtualRange {
    if (this.#itemCount === 0) {
      return { start: 0, end: 0, totalSize: 0, offsetTop: 0 };
    }

    const first = Math.floor(this.#scrollOffset / this.#itemSize);
    const visible = Math.ceil(this.#viewportSize / this.#itemSize) + 1;

    const start = Math.max(0, first - this.#overscan);
    const end = Math.min(this.#itemCount, first + visible + this.#overscan);

    return {
      start,
      end,
      totalSize: this.#totalSize(),
      offsetTop: start * this.#itemSize,
    };
  }

  #update(): void {
    if (this.#disposed) return;

    const next = this.#computeRange();
    const changed =
      next.start !== this.#range.start ||
      next.end !== this.#range.end ||
      next.totalSize !== this.#range.totalSize;

    this.#range = next;
    if (!changed) return;

    for (const listener of [...this.#listeners]) listener(next);
  }
}

/** Fungsi pembantu untuk pemakaian sekali pakai. */
export function createVirtualizer(options: VirtualizerOptions): Virtualizer {
  return new Virtualizer(options);
}
