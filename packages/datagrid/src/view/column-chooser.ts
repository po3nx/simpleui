import type { ColumnState } from '../model/columns.js';
import { SELECTION_COLUMN_ID } from './selection-column.js';

/**
 * Column chooser DataGrid (DG-046): pilih kolom terlihat, tampilkan semua,
 * dan teruskan daftar kolom tersembunyi untuk dipersistenkan consumer.
 */

export interface ColumnChooserOptions {
  readonly getColumns: () => readonly ColumnState<unknown>[];
  readonly getHidden: () => ReadonlySet<string>;
  readonly onChange: (hidden: readonly string[]) => void;
}

export interface ColumnChooser {
  readonly element: HTMLElement;
  open(anchor: HTMLElement): void;
  close(): void;
  dispose(): void;
}

class ColumnChooserImpl implements ColumnChooser {
  readonly element: HTMLElement;
  readonly #options: ColumnChooserOptions;
  readonly #button: HTMLButtonElement;
  #panel: HTMLElement | null = null;
  #anchor: HTMLElement | null = null;
  #onOutside: ((event: PointerEvent) => void) | null = null;

  constructor(options: ColumnChooserOptions) {
    this.#options = options;
    this.element = document.createElement('div');
    this.element.className = 'sui-grid__toolbar';
    this.#button = document.createElement('button');
    this.#button.type = 'button';
    this.#button.className = 'sui-grid__chooser-button';
    this.#button.textContent = 'Kolom';
    this.#button.setAttribute('aria-haspopup', 'dialog');
    this.#button.setAttribute('aria-expanded', 'false');
    this.#button.addEventListener('click', () => this.open(this.#button));
    this.element.append(this.#button);
  }

  #columns(): readonly ColumnState<unknown>[] {
    return this.#options
      .getColumns()
      .filter((column) => column.id !== SELECTION_COLUMN_ID);
  }

  #apply(visibleId: string, visible: boolean): void {
    const hidden = new Set(this.#options.getHidden());
    if (visible) hidden.delete(visibleId);
    else hidden.add(visibleId);
    this.#options.onChange([...hidden]);
    this.#renderList();
  }

  #renderList(): void {
    const panel = this.#panel;
    if (!panel) return;
    const hidden = this.#options.getHidden();
    const list = panel.querySelector('.sui-grid__chooser-list') as HTMLElement;
    list.replaceChildren();
    for (const column of this.#columns()) {
      const row = document.createElement('label');
      row.className = 'sui-grid__chooser-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !hidden.has(column.id);
      checkbox.setAttribute('aria-label', `Tampilkan ${column.caption}`);
      checkbox.addEventListener('change', () =>
        this.#apply(column.id, checkbox.checked),
      );
      row.append(checkbox, document.createTextNode(column.caption));
      list.append(row);
    }
  }

  open(anchor: HTMLElement): void {
    this.close();
    this.#anchor = anchor;
    anchor.setAttribute('aria-expanded', 'true');

    const panel = document.createElement('div');
    panel.className = 'sui-grid__chooser-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Pilih kolom');

    const list = document.createElement('div');
    list.className = 'sui-grid__chooser-list';
    const showAll = document.createElement('button');
    showAll.type = 'button';
    showAll.className = 'sui-grid__chooser-all';
    showAll.textContent = 'Tampilkan semua';
    showAll.addEventListener('click', () => {
      this.#options.onChange([]);
      this.#renderList();
    });

    panel.append(list, showAll);
    document.body.append(panel);
    const width = 260;
    const rect = anchor.getBoundingClientRect();
    const rtl = getComputedStyle(anchor).direction === 'rtl';
    const anchorLeft = rtl ? rect.right - width : rect.left;
    panel.style.left = `${Math.max(8, Math.min(anchorLeft, window.innerWidth - width - 8))}px`;
    const top = Math.min(
      rect.bottom + 4,
      window.innerHeight - panel.offsetHeight - 8,
    );
    panel.style.top = `${Math.max(8, top)}px`;

    this.#panel = panel;
    this.#renderList();
    list.querySelector('input')?.focus();

    this.#onOutside = (event) => {
      if (!panel.contains(event.target as Node)) this.close();
    };
    document.addEventListener('pointerdown', this.#onOutside);
  }

  close(): void {
    if (this.#panel) this.#panel.remove();
    if (this.#anchor) this.#anchor.setAttribute('aria-expanded', 'false');
    this.#panel = null;
    this.#anchor = null;
    if (this.#onOutside) {
      document.removeEventListener('pointerdown', this.#onOutside);
    }
    this.#onOutside = null;
  }

  dispose(): void {
    this.close();
    this.element.remove();
  }
}

export function createColumnChooser(
  options: ColumnChooserOptions,
): ColumnChooser {
  return new ColumnChooserImpl(options);
}
