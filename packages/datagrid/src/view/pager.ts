import { pageCountFor } from '../data/paging.js';

/**
 * Pager DataGrid (DG-043): prev/next, ukuran halaman, dan total tidak dikenal.
 */

export interface PagingState {
  readonly pageIndex: number;
  readonly pageSize: number;
  /** null/undefined berarti total belum diketahui (mode next-page). */
  readonly totalCount?: number | null | undefined;
  /** Jumlah baris termuat pada halaman ini (untuk total tidak dikenal). */
  readonly itemCount?: number | undefined;
}

export interface PagerOptions extends PagingState {
  readonly pageSizes?: readonly number[] | undefined;
  readonly onPageChange?:
    ((state: { pageIndex: number; pageSize: number }) => void) | undefined;
}

export interface Pager {
  readonly element: HTMLElement;
  setState(state: PagingState): void;
  dispose(): void;
}

const DEFAULT_SIZES = [10, 20, 50, 100];

class PagerImpl implements Pager {
  readonly element: HTMLElement;
  readonly #prev: HTMLButtonElement;
  readonly #next: HTMLButtonElement;
  readonly #status: HTMLElement;
  readonly #sizes: HTMLSelectElement;
  readonly #options: PagerOptions;
  #state: PagingState;

  constructor(options: PagerOptions) {
    this.#options = options;
    this.#state = {
      pageIndex: options.pageIndex,
      pageSize: options.pageSize,
      totalCount: options.totalCount,
      itemCount: options.itemCount,
    };

    this.element = document.createElement('div');
    this.element.className = 'sui-grid__pager';
    this.element.setAttribute('role', 'navigation');
    this.element.setAttribute('aria-label', 'Navigasi halaman');

    this.#prev = this.#button('‹', 'Halaman sebelumnya');
    this.#next = this.#button('›', 'Halaman berikutnya');
    this.#status = document.createElement('span');
    this.#status.className = 'sui-grid__pager-status';
    this.#status.setAttribute('aria-live', 'polite');

    const label = document.createElement('label');
    label.className = 'sui-grid__pager-size';
    label.textContent = 'Baris ';
    this.#sizes = document.createElement('select');
    this.#sizes.setAttribute('aria-label', 'Ukuran halaman');
    for (const size of options.pageSizes ?? DEFAULT_SIZES) {
      const option = document.createElement('option');
      option.value = String(size);
      option.textContent = String(size);
      this.#sizes.append(option);
    }
    label.append(this.#sizes);

    this.element.append(this.#prev, this.#status, this.#next, label);
    this.#prev.addEventListener('click', () =>
      this.#go(this.#state.pageIndex - 1),
    );
    this.#next.addEventListener('click', () =>
      this.#go(this.#state.pageIndex + 1),
    );
    this.#sizes.addEventListener('change', () => {
      this.#options.onPageChange?.({
        pageIndex: 0,
        pageSize: Number(this.#sizes.value),
      });
    });
    this.#render();
  }

  #button(text: string, label: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sui-grid__pager-button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    return button;
  }

  #go(pageIndex: number): void {
    if (pageIndex < 0 || pageIndex === this.#state.pageIndex) return;
    if (this.#isLast() && pageIndex > this.#state.pageIndex) return;
    this.#options.onPageChange?.({
      pageIndex,
      pageSize: this.#state.pageSize,
    });
  }

  #isLast(): boolean {
    const { totalCount, pageIndex, pageSize } = this.#state;
    if (totalCount !== null && totalCount !== undefined) {
      return pageIndex + 1 >= pageCountFor(totalCount, pageSize);
    }
    return (
      this.#state.itemCount !== undefined && this.#state.itemCount < pageSize
    );
  }

  #render(): void {
    const { pageIndex, pageSize, totalCount, itemCount } = this.#state;
    this.#sizes.value = String(pageSize);
    this.#prev.disabled = pageIndex <= 0;
    this.#next.disabled = this.#isLast();

    if (totalCount !== null && totalCount !== undefined) {
      const pages = pageCountFor(totalCount, pageSize);
      this.#status.textContent = `Halaman ${pageIndex + 1} dari ${pages} • ${totalCount} data`;
    } else {
      const loaded = itemCount ?? pageSize;
      this.#status.textContent = `Halaman ${pageIndex + 1} • ${loaded} dimuat`;
    }
  }

  setState(state: PagingState): void {
    this.#state = {
      pageIndex: state.pageIndex,
      pageSize: state.pageSize,
      totalCount: state.totalCount,
      itemCount: state.itemCount,
    };
    this.#render();
  }

  dispose(): void {
    this.element.remove();
  }
}

export function createPager(options: PagerOptions): Pager {
  return new PagerImpl(options);
}
