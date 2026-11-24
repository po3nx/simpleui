import {
  isNavigationKey,
  nextIndex,
  type NavigationOptions,
} from './keyboard.js';

/**
 * Roving tabindex untuk satu kelompok elemen (FND-014,
 * docs/06-theming-a11y-i18n.md §4).
 *
 * Hanya satu item memiliki `tabindex="0"`; sisanya `-1`. Tombol panah
 * memindahkan fokus, Home/End menuju ujung.
 */
export interface RovingTabindexOptions extends NavigationOptions {
  /** Ambil daftar item terkini; boleh berubah antar render. */
  getItems: () => HTMLElement[];
}

export class RovingTabindex {
  readonly #options: RovingTabindexOptions;
  #activeIndex = 0;
  #disposed = false;

  constructor(options: RovingTabindexOptions) {
    this.#options = options;
    this.sync();
  }

  get activeIndex(): number {
    return this.#activeIndex;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  /** Sinkronkan `tabindex` seluruh item dengan indeks aktif saat ini. */
  sync(): void {
    if (this.#disposed) return;

    const items = this.#options.getItems();
    if (items.length === 0) {
      this.#activeIndex = -1;
      return;
    }

    this.#activeIndex = Math.min(
      Math.max(this.#activeIndex, 0),
      items.length - 1,
    );
    items.forEach((item, index) => {
      item.tabIndex = index === this.#activeIndex ? 0 : -1;
    });
  }

  /** Pindahkan item aktif; fokus DOM dipindahkan bila `focus` diminta. */
  activate(index: number, options: { focus?: boolean } = {}): void {
    if (this.#disposed) return;

    const items = this.#options.getItems();
    if (items.length === 0) return;

    this.#activeIndex = Math.min(Math.max(index, 0), items.length - 1);
    items.forEach((item, itemIndex) => {
      item.tabIndex = itemIndex === this.#activeIndex ? 0 : -1;
    });

    if (options.focus) items[this.#activeIndex]?.focus();
  }

  /**
   * Tangani tombol navigasi. Mengembalikan `true` bila event sudah ditangani
   * (pemanggil tidak perlu `preventDefault` lagi).
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (this.#disposed || !isNavigationKey(event.key)) return false;

    const items = this.#options.getItems();
    const navigation: NavigationOptions = {};
    if (this.#options.orientation !== undefined) {
      navigation.orientation = this.#options.orientation;
    }
    if (this.#options.wrap !== undefined) navigation.wrap = this.#options.wrap;

    const target = nextIndex(
      this.#activeIndex,
      items.length,
      event.key,
      navigation,
    );

    if (target === null) return false;

    event.preventDefault();
    this.activate(target, { focus: true });
    return true;
  }

  dispose(): void {
    this.#disposed = true;
  }
}
