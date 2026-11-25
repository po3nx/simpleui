/**
 * Context menu DataGrid (DG-049): salin sel/baris dengan guard formula dan
 * fallback clipboard.
 */

const DANGEROUS = /^[=+\-@\t\r\n]/;

/** Guard formula untuk satu nilai clipboard. */
export function guardClipboardText(text: string): string {
  return DANGEROUS.test(text) ? `'${text}` : text;
}

/** Format sel TSV: guard formula + quote bila mengandung tab/newline/quote. */
export function tsvCell(text: string): string {
  const guarded = guardClipboardText(text);
  if (/[\t\r\n"]/.test(guarded)) {
    return `"${guarded.replaceAll('"', '""')}"`;
  }
  return guarded;
}

async function writeClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
}

export interface ContextMenuOptions {
  readonly enabled?: boolean;
}

export interface ContextMenu {
  dispose(): void;
}

interface MenuItem {
  readonly label: string;
  readonly run: (cell: HTMLElement) => string;
}

const ITEMS: readonly MenuItem[] = [
  {
    label: 'Salin sel',
    run: (cell) => guardClipboardText(cell.textContent ?? ''),
  },
  {
    label: 'Salin baris',
    run: (cell) => {
      const row = cell.closest('[role="row"]');
      if (!row) return '';
      return [...row.querySelectorAll<HTMLElement>('[role="gridcell"]')]
        .map((entry) => tsvCell(entry.textContent ?? ''))
        .join('\t');
    },
  },
];

class ContextMenuImpl implements ContextMenu {
  readonly #element: HTMLElement;
  readonly #enabled: boolean;
  #menu: HTMLElement | null = null;

  constructor(element: HTMLElement, options: ContextMenuOptions) {
    this.#element = element;
    this.#enabled = options.enabled ?? true;
    element.addEventListener('contextmenu', this.#onContextMenu);
    element.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('keydown', this.#onDocumentKey);
    document.addEventListener('pointerdown', this.#onOutside);
  }

  #close(): void {
    this.#menu?.remove();
    this.#menu = null;
  }

  #open(cell: HTMLElement, x: number, y: number): void {
    this.#close();
    const panel = document.createElement('div');
    panel.className = 'sui-grid__context-menu';
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-label', 'Menu konteks');

    for (const item of ITEMS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.textContent = item.label;
      button.addEventListener('click', () => {
        const text = item.run(cell);
        if (text !== '') void writeClipboard(text);
        this.#close();
        cell.focus();
      });
      panel.append(button);
    }

    document.body.append(panel);
    panel.style.left = `${Math.min(x, window.innerWidth - 180)}px`;
    panel.style.top = `${Math.min(y, window.innerHeight - 90)}px`;
    this.#menu = panel;
    panel.querySelector<HTMLButtonElement>('button')?.focus();
  }

  readonly #onContextMenu = (event: MouseEvent): void => {
    if (!this.#enabled) return;
    const cell = (event.target as HTMLElement).closest<HTMLElement>(
      '[role="gridcell"]',
    );
    if (!cell) return;
    event.preventDefault();
    this.#open(cell, event.clientX, event.clientY);
  };

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (!this.#enabled) return;
    if (event.key === 'Escape' && this.#menu) {
      event.preventDefault();
      this.#close();
      return;
    }
    const openKey =
      event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey);
    if (!openKey) return;
    const cell = (event.target as HTMLElement).closest<HTMLElement>(
      '[role="gridcell"]',
    );
    if (!cell) return;
    event.preventDefault();
    const rect = cell.getBoundingClientRect();
    this.#open(cell, rect.left, rect.bottom);
  };

  readonly #onDocumentKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.#menu) return;
    event.preventDefault();
    this.#close();
  };

  readonly #onOutside = (event: PointerEvent): void => {
    if (this.#menu && !this.#menu.contains(event.target as Node)) {
      this.#close();
    }
  };

  dispose(): void {
    this.#close();
    this.#element.removeEventListener('contextmenu', this.#onContextMenu);
    this.#element.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('keydown', this.#onDocumentKey);
    document.removeEventListener('pointerdown', this.#onOutside);
  }
}

export function attachContextMenu(
  element: HTMLElement,
  options: ContextMenuOptions = {},
): ContextMenu {
  return new ContextMenuImpl(element, options);
}
