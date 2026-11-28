import type { Key } from '@simpleui/core';

import type { ColumnState } from '../model/columns.js';

/**
 * Editor sel/baris DataGrid (DG-061): lifecycle input, commit/cancel,
 * commitOnBlur, dan navigasi Tab. Model transaksi ada di editing-model.
 */

export type EditorUiMode = 'none' | 'cell' | 'row' | 'batch' | 'form';

export interface EditingUiOptions<T extends object> {
  readonly mode?: EditorUiMode;
  readonly commitOnBlur?: boolean;
  readonly onStart?: (rowKey: Key, columnId: string | null, row: T) => unknown;
  readonly onCommit?: (rowKey: Key, changes: Partial<T>, row: T) => void;
  readonly onCancel?: (rowKey: Key) => void;
}

export interface CellEditor<T extends object> {
  begin(rowElement: HTMLElement, row: T, columnId: string | null): boolean;
  commit(): boolean;
  cancel(): void;
  isEditing(): boolean;
  dispose(): void;
}

interface EditorEntry<T extends object> {
  readonly column: ColumnState<T>;
  readonly input: HTMLInputElement;
  readonly cell: HTMLElement;
  readonly previousTabIndex: string | null;
  readonly previousText: string;
}

interface EditorSession<T extends object> {
  readonly rowKey: Key;
  readonly row: T;
  readonly rowElement: HTMLElement;
  readonly entries: EditorEntry<T>[];
}

const EDITOR_CLASS = 'sui-grid__editor';

function rawValue<T extends object>(row: T, column: ColumnState<T>): unknown {
  if (column.calculateCellValue) return column.calculateCellValue(row);
  return (row as Record<string, unknown>)[column.dataField ?? column.id];
}

function inputFor<T extends object>(
  row: T,
  column: ColumnState<T>,
): HTMLInputElement {
  const input = document.createElement('input');
  const value = rawValue(row, column);
  input.type =
    column.dataType === 'number'
      ? 'number'
      : column.dataType === 'date'
        ? 'date'
        : column.dataType === 'boolean'
          ? 'checkbox'
          : 'text';
  input.className = EDITOR_CLASS;
  input.setAttribute('aria-label', `Edit ${column.caption}`);
  if (column.dataType === 'boolean') {
    input.checked = value === true;
  } else if (value !== null && value !== undefined) {
    input.value = String(value);
  }
  return input;
}

function readInput<T extends object>(entry: EditorEntry<T>): unknown {
  const { input, column } = entry;
  if (column.dataType === 'boolean') return input.checked;
  if (column.dataType === 'number') {
    return input.value === '' ? null : Number(input.value);
  }
  return input.value;
}

function entryFor<T extends object>(
  session: EditorSession<T>,
  target: EventTarget | null,
): EditorEntry<T> | undefined {
  return session.entries.find((entry) => entry.input === target);
}

class CellEditorImpl<T extends object> implements CellEditor<T> {
  readonly #options: EditingUiOptions<T>;
  readonly #columns: readonly ColumnState<T>[];
  #session: EditorSession<T> | null = null;
  #disposed = false;

  constructor(
    options: EditingUiOptions<T>,
    columns: readonly ColumnState<T>[],
  ) {
    this.#options = options;
    this.#columns = columns;
  }

  isEditing(): boolean {
    return this.#session !== null;
  }

  begin(rowElement: HTMLElement, row: T, columnId: string | null): boolean {
    if (this.#disposed) return false;
    const mode = this.#options.mode ?? 'none';
    if (mode !== 'cell' && mode !== 'row') return false;
    this.commit();

    const rowKey = this.#keyOf(row);
    if (this.#options.onStart?.(rowKey, columnId, row) === false) {
      return false;
    }
    const columns = this.#editableColumns(mode, columnId);
    if (columns.length === 0) return false;

    const entries = this.#createEntries(row, rowElement, columns);
    if (entries.length === 0) return false;

    this.#session = { rowKey, row, rowElement, entries };
    this.#bind();
    entries[0]?.input.focus();
    entries[0]?.input.select();
    return true;
  }

  #createEntries(
    row: T,
    rowElement: HTMLElement,
    columns: readonly ColumnState<T>[],
  ): EditorEntry<T>[] {
    const entries: EditorEntry<T>[] = [];
    for (const column of columns) {
      const cell = rowElement.querySelector<HTMLElement>(
        `[data-column-id="${CSS.escape(column.id)}"]`,
      );
      if (!cell) continue;
      const previousText = cell.textContent ?? '';
      const previousTabIndex = cell.getAttribute('tabindex');
      const input = inputFor(row, column);
      cell.replaceChildren(input);
      cell.classList.add('sui-grid__cell--editing');
      entries.push({
        column,
        input,
        cell,
        previousTabIndex,
        previousText,
      });
    }
    return entries;
  }

  #keyOf(row: T): Key {
    const id = this.#columns[0]?.id;
    void id;
    return (row as Record<string, unknown>)['id'] as Key;
  }

  #editableColumns(
    mode: EditorUiMode,
    columnId: string | null,
  ): readonly ColumnState<T>[] {
    const editable = this.#columns.filter(
      (column) => column.allowEditing && !column.cellTemplate,
    );
    if (mode === 'row') return editable;
    return editable.filter((column) => column.id === columnId);
  }

  #bind(): void {
    const session = this.#session;
    if (!session) return;
    for (const entry of session.entries) {
      entry.input.addEventListener('keydown', this.#onKeyDown);
      entry.input.addEventListener('blur', this.#onBlur);
    }
  }

  #unbind(): void {
    const session = this.#session;
    if (!session) return;
    for (const entry of session.entries) {
      entry.input.removeEventListener('keydown', this.#onKeyDown);
      entry.input.removeEventListener('blur', this.#onBlur);
    }
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const session = this.#session;
    if (!session) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commit();
      return;
    }
    if (event.key !== 'Tab' || this.#options.mode !== 'row') return;
    const current = entryFor(session, event.target);
    if (!current) return;
    const index = session.entries.indexOf(current);
    const next = session.entries[index + (event.shiftKey ? -1 : 1)];
    if (!next) return;
    event.preventDefault();
    next.input.focus();
    next.input.select();
  };

  readonly #onBlur = (event: FocusEvent): void => {
    if (this.#options.commitOnBlur !== false) {
      const session = this.#session;
      if (!session) return;
      const next = event.relatedTarget;
      if (next instanceof Node && session.rowElement.contains(next)) return;
      this.commit();
      return;
    }
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !this.#session?.rowElement.contains(next)) {
      this.cancel();
    }
  };

  commit(): boolean {
    const session = this.#session;
    if (!session) return false;
    const changes: Record<string, unknown> = {};
    for (const entry of session.entries) {
      changes[entry.column.dataField ?? entry.column.id] = readInput(entry);
    }
    this.#finish(false);
    this.#options.onCommit?.(
      session.rowKey,
      changes as Partial<T>,
      session.row,
    );
    return true;
  }

  cancel(): void {
    const session = this.#session;
    if (!session) return;
    this.#finish(true);
    this.#options.onCancel?.(session.rowKey);
  }

  #finish(restore: boolean): void {
    const session = this.#session;
    if (!session) return;
    this.#unbind();
    for (const entry of session.entries) {
      entry.cell.classList.remove('sui-grid__cell--editing');
      if (entry.previousTabIndex === null)
        entry.cell.removeAttribute('tabindex');
      else entry.cell.setAttribute('tabindex', entry.previousTabIndex);
      entry.cell.textContent = restore
        ? entry.previousText
        : String(readInput(entry) ?? '');
    }
    this.#session = null;
  }

  dispose(): void {
    this.#disposed = true;
    this.#finish(true);
  }
}

export function createCellEditor<T extends object>(
  options: EditingUiOptions<T>,
  columns: readonly ColumnState<T>[],
): CellEditor<T> {
  return new CellEditorImpl(options, columns);
}
