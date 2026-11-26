import type { Key } from '@simpleui/core';

import type { FocusModel } from '../model/focus.js';

/**
 * Keyboard navigation DataGrid (DG-045): panah, Home/End, Ctrl+Home/End,
 * PageUp/PageDown, roving tabindex, dan perpindahan header ↔ baris.
 */

export interface GridKeyboardOptions {
  readonly element: HTMLElement;
  readonly viewportElement: HTMLElement;
  readonly focus: FocusModel;
  readonly getRowKeys: () => readonly Key[];
  readonly rowHeight?: number;
  readonly liveElement?: HTMLElement | undefined;
}

const DEFAULT_ROW_HEIGHT = 40;

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest(
      'input, select, textarea, .sui-grid__filter-cell, .sui-grid__search, .sui-grid__filter-panel',
    ) !== null
  );
}

class GridKeyboard {
  readonly #options: GridKeyboardOptions;
  readonly #element: HTMLElement;
  readonly #viewport: HTMLElement;
  readonly #focus: FocusModel;
  readonly #rowHeight: number;

  constructor(options: GridKeyboardOptions) {
    this.#options = options;
    this.#element = options.element;
    this.#viewport = options.viewportElement;
    this.#focus = options.focus;
    this.#rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;
    this.#element.tabIndex = 0;
    this.#element.addEventListener('keydown', this.#onKeyDown);
  }

  dispose(): void {
    this.#element.removeEventListener('keydown', this.#onKeyDown);
  }

  #rowIndex(key: Key): number {
    return this.#options
      .getRowKeys()
      .findIndex((entry) => Object.is(entry, key));
  }

  #pageSize(): number {
    return Math.max(
      1,
      Math.floor(this.#viewport.clientHeight / this.#rowHeight) - 1,
    );
  }

  #setRoving(target: HTMLElement): void {
    this.#element
      .querySelectorAll<HTMLElement>('.sui-grid__cell[tabindex="0"]')
      .forEach((cell) => {
        cell.tabIndex = -1;
      });
    target.tabIndex = 0;
  }

  #cellElement(rowKey: Key, columnId: string): HTMLElement | null {
    const id = this.#focus.cellDomId(rowKey, columnId);
    const existing = document.getElementById(id);
    if (existing) return existing;

    // Baris tujuan mungkin di luar jendela virtual: gulir lalu render segera.
    const index = this.#rowIndex(rowKey);
    if (index < 0) return null;
    const rowsPerPage = Math.max(
      1,
      Math.floor(this.#viewport.clientHeight / this.#rowHeight),
    );
    this.#viewport.scrollTop = Math.max(
      0,
      (index - Math.floor(rowsPerPage / 2)) * this.#rowHeight,
    );
    this.#viewport.dispatchEvent(new Event('scroll'));
    return document.getElementById(id);
  }

  #focusCell(): void {
    if (!this.#focus.get()) this.#focus.first();
    const cell = this.#focus.get();
    if (!cell) return;
    const target = this.#cellElement(cell.rowKey, cell.columnId);
    if (!target) return;
    this.#setRoving(target);
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const live =
      this.#options.liveElement ??
      this.#element.parentElement?.querySelector('.sui-grid__live');
    if (live) {
      const rowIndex =
        target.closest('[role="row"]')?.getAttribute('aria-rowindex') ?? '?';
      live.textContent = `Baris ${rowIndex}, kolom ${target.getAttribute('aria-colindex') ?? '?'}.`;
    }
  }

  #focusHeader(columnId?: string): void {
    const id = columnId ?? this.#focus.get()?.columnId;
    if (!id) return;
    const cell = this.#element.querySelector<HTMLElement>(
      `.sui-grid__header [data-column-id="${CSS.escape(id)}"]`,
    );
    (cell?.querySelector<HTMLElement>('button') ?? cell)?.focus({
      preventScroll: true,
    });
  }

  #move(direction: 'up' | 'down' | 'left' | 'right'): void {
    this.#focus.move(direction);
    this.#focusCell();
  }

  #moveRows(delta: number): void {
    if (!this.#focus.get()) this.#focus.first();
    const current = this.#focus.get();
    if (!current) return;
    const keys = this.#options.getRowKeys();
    const index = this.#rowIndex(current.rowKey);
    const next = keys[Math.min(keys.length - 1, Math.max(0, index + delta))];
    if (next !== undefined) {
      this.#focus.set({ rowKey: next, columnId: current.columnId });
    }
    this.#focusCell();
  }

  #handleHeader(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    if (target.closest('.sui-grid__header') === null) return false;
    if (event.key !== 'ArrowDown') return true;
    event.preventDefault();
    this.#focus.first();
    this.#focusCell();
    return true;
  }

  #handleNoFocus(event: KeyboardEvent): boolean {
    if (this.#focus.get()) return false;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowRight') return false;
    event.preventDefault();
    this.#focus.first();
    this.#focusCell();
    return true;
  }

  #handlers(): Record<string, (event: KeyboardEvent) => void> {
    const gridJump = (event: KeyboardEvent): boolean =>
      event.ctrlKey || event.metaKey;
    return {
      ArrowUp: () => {
        const current = this.#focus.get();
        if (!current) return;
        if (this.#rowIndex(current.rowKey) === 0) this.#focusHeader();
        else this.#move('up');
      },
      ArrowDown: () => this.#move('down'),
      ArrowLeft: () => this.#move('left'),
      ArrowRight: () => this.#move('right'),
      Home: (event) => {
        this.#focus.moveTo('start', gridJump(event) ? 'grid' : 'row');
        this.#focusCell();
      },
      End: (event) => {
        this.#focus.moveTo('end', gridJump(event) ? 'grid' : 'row');
        this.#focusCell();
      },
      PageUp: () => this.#moveRows(-this.#pageSize()),
      PageDown: () => this.#moveRows(this.#pageSize()),
    };
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (isEditable(event.target)) return;
    if (this.#handleHeader(event) || this.#handleNoFocus(event)) return;
    const handler = this.#handlers()[event.key];
    if (!handler) return;
    event.preventDefault();
    handler(event);
  };
}

export function attachGridKeyboard(options: GridKeyboardOptions): () => void {
  const keyboard = new GridKeyboard(options);
  return () => keyboard.dispose();
}
