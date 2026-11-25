/**
 * Search panel DataGrid (DG-042): input pencarian di atas grid, debounce,
 * scope kolom, dan tombol bersihkan.
 */

export interface SearchPanelOptions {
  readonly debounceMs?: number | undefined;
  readonly fields?: readonly string[] | undefined;
  readonly placeholder?: string | undefined;
  readonly onSearchChange?:
    ((query: string, fields: readonly string[]) => void) | undefined;
}

export interface SearchPanel {
  readonly element: HTMLElement;
  setFields(fields: readonly string[]): void;
  setQuery(query: string): void;
  dispose(): void;
}

const DEFAULT_DEBOUNCE = 250;

class SearchPanelImpl implements SearchPanel {
  readonly element: HTMLElement;
  readonly #input: HTMLInputElement;
  readonly #clear: HTMLButtonElement;
  readonly #options: SearchPanelOptions;
  #fields: string[];
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: SearchPanelOptions) {
    this.#options = options;
    this.#fields = [...(options.fields ?? [])];

    this.element = document.createElement('div');
    this.element.className = 'sui-grid__search';
    this.element.setAttribute('role', 'search');

    this.#input = document.createElement('input');
    this.#input.type = 'search';
    this.#input.className = 'sui-grid__search-input';
    this.#input.placeholder = options.placeholder ?? 'Cari…';
    this.#input.setAttribute('aria-label', 'Cari data');

    this.#clear = document.createElement('button');
    this.#clear.type = 'button';
    this.#clear.className = 'sui-grid__search-clear';
    this.#clear.textContent = '×';
    this.#clear.setAttribute('aria-label', 'Bersihkan pencarian');
    this.#clear.hidden = true;

    this.#input.addEventListener('input', () => {
      this.#clear.hidden = this.#input.value.length === 0;
      this.#schedule();
    });
    this.#input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.#clearNow();
    });
    this.#clear.addEventListener('click', () => {
      this.#clearNow();
      this.#input.focus();
    });

    this.element.append(this.#input, this.#clear);
  }

  #emit(query: string): void {
    this.#options.onSearchChange?.(query, [...this.#fields]);
  }

  #cancel(): void {
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = null;
  }

  #schedule(): void {
    this.#cancel();
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.#emit(this.#input.value.trim());
    }, this.#options.debounceMs ?? DEFAULT_DEBOUNCE);
  }

  #clearNow(): void {
    this.setQuery('');
    this.#cancel();
    this.#emit('');
  }

  setQuery(query: string): void {
    this.#input.value = query;
    this.#clear.hidden = query.length === 0;
  }

  setFields(fields: readonly string[]): void {
    this.#fields = [...fields];
  }

  dispose(): void {
    this.#cancel();
    this.element.remove();
  }
}

export function createSearchPanel(
  options: SearchPanelOptions = {},
): SearchPanel {
  return new SearchPanelImpl(options);
}
