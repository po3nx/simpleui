/**
 * Focus trap untuk dialog dan overlay (FND-014, R-A11Y-03).
 *
 * Trap hanya menahan Tab/Shift+Tab di dalam root; menutup overlay tetap
 * tanggung jawab pemanggil (biasanya lewat `isEscapeKey`).
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Daftar elemen yang dapat menerima fokus di dalam root. */
export function getFocusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) =>
      !element.hasAttribute('hidden') &&
      element.getAttribute('aria-hidden') !== 'true',
  );
}

export interface FocusTrapOptions {
  /** Elemen yang difokuskan saat trap aktif; default item pertama. */
  initialFocus?: HTMLElement;
}

export class FocusTrap {
  readonly #root: HTMLElement;
  readonly #initialFocus: HTMLElement | undefined;
  #previousFocus: HTMLElement | null = null;
  #active = false;

  constructor(root: HTMLElement, options: FocusTrapOptions = {}) {
    this.#root = root;
    this.#initialFocus = options.initialFocus;
  }

  get active(): boolean {
    return this.#active;
  }

  /** Simpan fokus sebelumnya lalu pindahkan fokus ke dalam root. */
  activate(): void {
    if (this.#active) return;

    this.#active = true;
    this.#previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const target = this.#initialFocus ?? getFocusable(this.#root)[0];
    (target ?? this.#root).focus();
  }

  /** Kembalikan fokus ke elemen sebelum trap diaktifkan. */
  deactivate(): void {
    if (!this.#active) return;

    this.#active = false;
    const previous = this.#previousFocus;
    this.#previousFocus = null;

    if (previous && previous.isConnected) previous.focus();
  }

  /**
   * Tangani Tab/Shift+Tab agar fokus berputar di dalam root.
   * Mengembalikan `true` bila event sudah ditangani.
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.#active || event.key !== 'Tab') return false;

    const items = getFocusable(this.#root);
    if (items.length === 0) {
      event.preventDefault();
      this.#root.focus();
      return true;
    }

    const current = document.activeElement;
    if (!(current instanceof HTMLElement) || !this.#root.contains(current)) {
      event.preventDefault();
      items[0]?.focus();
      return true;
    }

    return this.#wrapFocus(event, current, items);
  }

  /** Putar fokus bila berada di ujung daftar. */
  #wrapFocus(
    event: KeyboardEvent,
    current: HTMLElement,
    items: HTMLElement[],
  ): boolean {
    const target = event.shiftKey ? items[items.length - 1] : items[0];
    const edge = event.shiftKey ? items[0] : items[items.length - 1];

    if (current !== edge) return false;

    event.preventDefault();
    target?.focus();
    return true;
  }
}
