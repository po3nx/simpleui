import type { FilterExpression } from '@simpleui/core';

import type { ColumnState } from '../model/columns.js';

/**
 * Header filter DataGrid (DG-041): nilai unik, pencarian, blanks, pilih
 * semua/kosongkan, dan integrasi filterValue.
 */

export interface HeaderFilterOptions {
  readonly getUniqueValues?:
    ((columnId: string) => readonly unknown[]) | undefined;
  readonly onApply: (filter: FilterExpression | null) => void;
  readonly locale?: string | undefined;
  readonly liveElement?: HTMLElement | undefined;
}

export interface HeaderFilter {
  open(column: ColumnState<unknown>, anchor: HTMLElement): void;
  close(restoreFocus?: boolean): void;
  dispose(): void;
}

const PANEL_WIDTH = 280;
const BLANK_KEY = 'blank:null';

interface ValueEntry {
  readonly key: string;
  readonly value: unknown;
}

function valueKey(value: unknown): string {
  if (value === null || value === undefined) return BLANK_KEY;
  return `${typeof value}:${String(value)}`;
}

function uniqueValues(
  values: readonly unknown[],
  locale: string,
): ValueEntry[] {
  const map = new Map<string, unknown>();
  for (const value of values) map.set(valueKey(value), value);
  const collator = new Intl.Collator(locale, { numeric: true });
  return [...map.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((left, right) => {
      if (left.value === null || left.value === undefined) return 1;
      if (right.value === null || right.value === undefined) return -1;
      return collator.compare(String(left.value), String(right.value));
    });
}

function labelFor(value: unknown): string {
  return value === null || value === undefined ? '(Blanks)' : String(value);
}

function buildFilter(
  column: ColumnState<unknown>,
  selected: readonly ValueEntry[],
  total: number,
): FilterExpression | null {
  if (selected.length === 0 || selected.length === total) return null;
  const selector = column.dataField ?? column.id;
  if (selected.length === 1 && selected[0]?.key === BLANK_KEY) {
    return [selector, 'eq', null];
  }
  return [selector, 'in', selected.map((entry) => entry.value)];
}

function optionRow(entry: ValueEntry, selected: Set<string>): HTMLElement {
  const row = document.createElement('label');
  row.className = 'sui-grid__filter-option';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = selected.has(entry.key);
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) selected.add(entry.key);
    else selected.delete(entry.key);
  });
  row.append(checkbox, document.createTextNode(labelFor(entry.value)));
  return row;
}

function renderOptions(
  list: HTMLElement,
  values: readonly ValueEntry[],
  selected: Set<string>,
  query: string,
): void {
  const needle = query.trim().toLowerCase();
  list.replaceChildren();
  for (const entry of values) {
    const label = labelFor(entry.value);
    if (needle && !label.toLowerCase().includes(needle)) continue;
    list.append(optionRow(entry, selected));
  }
}

function createActions(
  values: readonly ValueEntry[],
  selected: Set<string>,
  rerender: () => void,
): HTMLElement {
  const actions = document.createElement('div');
  actions.className = 'sui-grid__filter-actions';
  for (const [label, fill] of [
    ['Pilih semua', true],
    ['Kosongkan', false],
  ] as const) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      selected.clear();
      if (fill) values.forEach((entry) => selected.add(entry.key));
      rerender();
    });
    actions.append(button);
  }
  return actions;
}

function createFooter(
  column: ColumnState<unknown>,
  values: readonly ValueEntry[],
  selected: Set<string>,
  applyFilter: (filter: FilterExpression | null) => void,
): HTMLElement {
  const footer = document.createElement('div');
  footer.className = 'sui-grid__filter-footer';
  const apply = document.createElement('button');
  apply.type = 'button';
  apply.className = 'sui-grid__filter-apply';
  apply.textContent = 'Terapkan';
  apply.addEventListener('click', () => {
    const chosen = values.filter((entry) => selected.has(entry.key));
    applyFilter(buildFilter(column, chosen, values.length));
  });
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Hapus filter';
  reset.addEventListener('click', () => applyFilter(null));
  footer.append(apply, reset);
  return footer;
}

class HeaderFilterImpl implements HeaderFilter {
  readonly #options: HeaderFilterOptions;
  #panel: HTMLElement | null = null;
  #anchor: HTMLElement | null = null;
  #onOutside: ((event: PointerEvent) => void) | null = null;

  constructor(options: HeaderFilterOptions) {
    this.#options = options;
  }

  close(restoreFocus = false): void {
    const anchor = this.#anchor;
    if (this.#panel) this.#panel.remove();
    if (anchor) anchor.setAttribute('aria-expanded', 'false');
    this.#panel = null;
    this.#anchor = null;
    if (restoreFocus) anchor?.focus({ preventScroll: true });
    if (this.#onOutside) {
      document.removeEventListener('pointerdown', this.#onOutside);
    }
    this.#onOutside = null;
  }

  #finish(column: ColumnState<unknown>, filter: FilterExpression | null): void {
    this.#options.onApply(filter);
    if (this.#options.liveElement) {
      this.#options.liveElement.textContent = filter
        ? `Filter ${column.caption} diterapkan.`
        : `Filter ${column.caption} dihapus.`;
    }
    this.close(true);
  }

  #buildPanel(column: ColumnState<unknown>, values: ValueEntry[]): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'sui-grid__filter-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', `Filter ${column.caption}`);

    const selected = new Set(values.map((entry) => entry.key));
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'sui-grid__filter-search';
    search.setAttribute('aria-label', `Cari nilai ${column.caption}`);
    search.placeholder = 'Cari…';

    const list = document.createElement('div');
    list.className = 'sui-grid__filter-list';
    const rerender = (): void =>
      renderOptions(list, values, selected, search.value);
    search.addEventListener('input', rerender);
    rerender();

    panel.append(
      search,
      createActions(values, selected, rerender),
      list,
      createFooter(column, values, selected, (filter) =>
        this.#finish(column, filter),
      ),
    );
    panel.dataset['search'] = 'true';
    (panel as HTMLElement & { _search?: HTMLInputElement })._search = search;
    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close(true);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = [
        ...panel.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (focusables.length === 0) return;
      const first = focusables[0] as HTMLElement;
      const last = focusables[focusables.length - 1] as HTMLElement;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    return panel;
  }

  open(column: ColumnState<unknown>, anchor: HTMLElement): void {
    this.close();
    this.#anchor = anchor;
    anchor.setAttribute('aria-expanded', 'true');

    const values = uniqueValues(
      this.#options.getUniqueValues?.(column.id) ?? [],
      this.#options.locale ?? 'en',
    );
    const panel = this.#buildPanel(column, values);
    document.body.append(panel);

    const rect = anchor.getBoundingClientRect();
    panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8))}px`;
    const top = Math.min(
      rect.bottom + 4,
      window.innerHeight - panel.offsetHeight - 8,
    );
    panel.style.top = `${Math.max(8, top)}px`;

    this.#panel = panel;
    const search = (panel as HTMLElement & { _search?: HTMLInputElement })
      ._search;
    search?.focus();

    this.#onOutside = (event) => {
      if (!panel.contains(event.target as Node)) this.close();
    };
    document.addEventListener('pointerdown', this.#onOutside);
  }

  dispose(): void {
    this.close();
  }
}

export function createHeaderFilter(options: HeaderFilterOptions): HeaderFilter {
  return new HeaderFilterImpl(options);
}
