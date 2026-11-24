/**
 * Layout service — peran `ResizeService` pada docs/01-arsitektur.md §5.5.
 *
 * - Mengukur elemen dan memantau perubahan ukuran lewat ResizeObserver.
 * - Observer dapat di-inject sehingga test tidak butuh browser.
 * - Import-safe: `ResizeObserver` baru disentuh saat `observe()` dipanggil.
 * - Semua observer dilepas di `dispose()` (R-ARC-08).
 */

export interface LayoutSize {
  readonly width: number;
  readonly height: number;
}

export interface ResizeObserverLike {
  observe(target: Element): void;
  unobserve(target: Element): void;
  disconnect(): void;
}

export interface ResizeEntryLike {
  target: Element;
  contentRect: { width: number; height: number };
}

export interface LayoutServiceOptions {
  /** Factory injeksi untuk test; default `globalThis.ResizeObserver`. */
  createObserver?: (
    callback: (entries: ResizeEntryLike[]) => void,
  ) => ResizeObserverLike;
  /** Pengukur elemen; default `getBoundingClientRect`. */
  measure?: (element: Element) => LayoutSize;
}

export interface LayoutService {
  /** Ukuran elemen saat ini (tanpa menunggu observer). */
  measure(element: Element): LayoutSize;
  /** Pantau perubahan ukuran; mengembalikan fungsi untuk berhenti. */
  observe(element: Element, listener: (size: LayoutSize) => void): () => void;
  dispose(): void;
  readonly observedCount: number;
  readonly disposed: boolean;
}

interface Entry {
  size: LayoutSize;
  listeners: Set<(size: LayoutSize) => void>;
}

function defaultMeasure(element: Element): LayoutSize {
  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function sameSize(a: LayoutSize, b: LayoutSize): boolean {
  return a.width === b.width && a.height === b.height;
}

class LayoutServiceImpl implements LayoutService {
  readonly #options: LayoutServiceOptions;
  readonly #entries = new Map<Element, Entry>();
  #observer: ResizeObserverLike | null = null;
  #disposed = false;

  constructor(options: LayoutServiceOptions) {
    this.#options = options;
  }

  get observedCount(): number {
    return this.#entries.size;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  measure(element: Element): LayoutSize {
    return (this.#options.measure ?? defaultMeasure)(element);
  }

  observe(element: Element, listener: (size: LayoutSize) => void): () => void {
    if (this.#disposed) return () => {};

    const entry = this.#ensureEntry(element);
    entry.listeners.add(listener);

    // Selalu kirim pengukuran awal: consumer tidak perlu memanggil measure()
    // sendiri, dan event ResizeObserver pertama (yang nilainya sama) akan
    // diabaikan oleh dedupe.
    listener(entry.size);

    return () => {
      this.#release(element, listener);
    };
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    this.#observer?.disconnect();
    this.#observer = null;
    this.#entries.clear();
  }

  #ensureEntry(element: Element): Entry {
    const existing = this.#entries.get(element);
    if (existing) return existing;

    const entry: Entry = { size: this.measure(element), listeners: new Set() };
    this.#entries.set(element, entry);
    this.#ensureObserver()?.observe(element);
    return entry;
  }

  #ensureObserver(): ResizeObserverLike | null {
    if (this.#observer) return this.#observer;

    const callback = (entries: ResizeEntryLike[]) =>
      this.#handleEntries(entries);

    if (this.#options.createObserver) {
      this.#observer = this.#options.createObserver(callback);
      return this.#observer;
    }

    const Observer = (globalThis as { ResizeObserver?: typeof ResizeObserver })
      .ResizeObserver;
    if (!Observer) return null;

    this.#observer = new Observer(callback as ResizeObserverCallback);
    return this.#observer;
  }

  #handleEntries(entries: readonly ResizeEntryLike[]): void {
    for (const entry of entries) {
      const record = this.#entries.get(entry.target);
      if (!record) continue;

      const size: LayoutSize = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      if (sameSize(record.size, size)) continue;

      record.size = size;
      for (const listener of [...record.listeners]) listener(size);
    }
  }

  #release(element: Element, listener: (size: LayoutSize) => void): void {
    const entry = this.#entries.get(element);
    if (!entry) return;

    entry.listeners.delete(listener);
    if (entry.listeners.size > 0) return;

    this.#observer?.unobserve(element);
    this.#entries.delete(element);
  }
}

/** Buat layout service; semua parameter opsional untuk test atau SSR. */
export function createLayoutService(
  options: LayoutServiceOptions = {},
): LayoutService {
  return new LayoutServiceImpl(options);
}

/** Ukur satu elemen tanpa membuat service. */
export function measureElement(element: Element): LayoutSize {
  return defaultMeasure(element);
}
