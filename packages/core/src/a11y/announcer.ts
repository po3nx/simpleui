import { setStyles } from '../dom/dom.js';

/**
 * Live region announcer (FND-014, R-A11Y-08).
 *
 * - Satu region `polite` per instance (docs/06 §4); region `assertive` dibuat
 *   hanya bila benar-benar dipakai.
 * - Pengumuman di-throttle: pesan terbaru menang, sehingga status yang berubah
 *   cepat tidak membanjiri screen reader.
 * - Import-safe: tidak menyentuh DOM sampai `announce()` pertama dipanggil.
 */

export type Politeness = 'polite' | 'assertive';

export interface AnnouncerOptions {
  /** Jeda minimum antar pengumuman dalam milidetik. Default 150. */
  throttleMs?: number;
  /** Container region; default `document.body`. */
  container?: HTMLElement;
}

const VISUALLY_HIDDEN = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  'clip-path': 'inset(50%)',
  'white-space': 'nowrap',
  border: '0',
} as const;

export class Announcer {
  readonly #throttleMs: number;
  readonly #container: HTMLElement | undefined;
  readonly #regions = new Map<Politeness, HTMLElement>();
  #pending: { message: string; politeness: Politeness } | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #disposed = false;

  constructor(options: AnnouncerOptions = {}) {
    this.#throttleMs = options.throttleMs ?? 150;
    this.#container = options.container;
  }

  /** Umumkan pesan; pesan berikutnya dalam jendela throttle menggantikan. */
  announce(message: string, politeness: Politeness = 'polite'): void {
    if (this.#disposed || message.length === 0) return;

    this.#pending = { message, politeness };

    if (this.#timer !== null) return;

    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.#flush();
    }, this.#throttleMs);
  }

  /** Kosongkan isi region tanpa menunggu throttle. */
  clear(): void {
    for (const region of this.#regions.values()) region.textContent = '';
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = null;
    this.#pending = null;

    for (const region of this.#regions.values()) region.remove();
    this.#regions.clear();
  }

  #flush(): void {
    const pending = this.#pending;
    this.#pending = null;
    if (!pending) return;

    const region = this.#region(pending.politeness);
    // Kosongkan dulu agar pesan yang sama tetap diumumkan ulang.
    region.textContent = '';
    region.textContent = pending.message;
  }

  #region(politeness: Politeness): HTMLElement {
    const existing = this.#regions.get(politeness);
    if (existing) return existing;

    const container = this.#container ?? document.body;
    const region = document.createElement('div');

    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', 'status');
    setStyles(region, VISUALLY_HIDDEN);
    container.append(region);

    this.#regions.set(politeness, region);
    return region;
  }
}
