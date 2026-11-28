import type { Key } from '@simpleui/core';

import type { ColumnState } from '../model/columns.js';
import {
  createLookupResolver,
  type LookupItem,
  type LookupOptions,
  type LookupResolver,
} from '../data/lookup.js';

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
  readonly onFormRequest?: (row: T, rowKey: Key) => void;
}

export interface CellEditor<T extends object> {
  begin(rowElement: HTMLElement, row: T, columnId: string | null): boolean;
  commit(): boolean;
  cancel(): void;
  isEditing(): boolean;
  dispose(): void;
}

interface LookupState {
  readonly resolver: LookupResolver;
  readonly byLabel: Map<string, unknown>;
  readonly original: unknown;
  timer: ReturnType<typeof setTimeout> | null;
  cleanup: () => void;
}

interface EditorEntry<T extends object> {
  readonly column: ColumnState<T>;
  readonly input: HTMLInputElement;
  readonly cell: HTMLElement;
  readonly previousTabIndex: string | null;
  readonly previousText: string;
  readonly lookup?: LookupState;
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
  const { input, column, lookup } = entry;
  if (lookup) return lookup.byLabel.get(input.value) ?? lookup.original;
  if (column.dataType === 'boolean') return input.checked;
  if (column.dataType === 'number') {
    return input.value === '' ? null : Number(input.value);
  }
  return input.value;
}

function displayValue<T extends object>(entry: EditorEntry<T>): string {
  const value = readInput(entry);
  if (entry.lookup) {
    if (entry.lookup.byLabel.has(entry.input.value)) {
      return entry.input.value;
    }
    return entry.lookup.resolver.getLabel(value) ?? String(value ?? '');
  }
  return String(value ?? '');
}

function attachLookupControls(
  input: HTMLInputElement,
  list: HTMLDataListElement,
  state: LookupState,
  lookup: LookupOptions,
): () => void {
  const renderOptions = (items: readonly LookupItem[]): void => {
    state.byLabel.clear();
    for (const item of items) {
      const option = document.createElement('option');
      option.value = item.text;
      state.byLabel.set(item.text, item.value);
      list.append(option);
    }
  };
  const load = (query: string): void => {
    list.replaceChildren();
    void state.resolver.search(query).then(renderOptions);
  };
  const onInput = (): void => {
    if (state.timer !== null) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.timer = null;
      load(input.value);
    }, lookup.debounceMs ?? 200);
  };
  const onFocus = (): void => load(input.value);
  input.addEventListener('input', onInput);
  input.addEventListener('focus', onFocus);
  void state.resolver.ensure([state.original]).then(() => {
    if (input.value === '') {
      input.value =
        state.resolver.getLabel(state.original) ?? String(state.original ?? '');
    }
  });
  return () => {
    if (state.timer !== null) clearTimeout(state.timer);
    state.timer = null;
    input.removeEventListener('input', onInput);
    input.removeEventListener('focus', onFocus);
  };
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
    if (mode === 'form') {
      this.#options.onFormRequest?.(row, this.#keyOf(row));
      return true;
    }
    if (mode !== 'cell' && mode !== 'row') return false;
    return this.#beginDom(rowElement, row, columnId, mode);
  }

  #beginDom(
    rowElement: HTMLElement,
    row: T,
    columnId: string | null,
    mode: EditorUiMode,
  ): boolean {
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
      const lookupEntry = this.#lookupEntry(row, column, cell);
      if (lookupEntry) {
        cell.classList.add('sui-grid__cell--editing');
        entries.push({ ...lookupEntry, previousTabIndex, previousText });
        continue;
      }
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

  #lookupEntry(
    row: T,
    column: ColumnState<T>,
    cell: HTMLElement,
  ): Omit<EditorEntry<T>, 'previousTabIndex' | 'previousText'> | undefined {
    const lookup = column.lookup;
    if (!lookup) return undefined;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = `${EDITOR_CLASS} sui-grid__editor--lookup`;
    input.setAttribute('aria-label', `Edit ${column.caption}`);
    const listId = `sui-lookup-${column.id}`;
    input.setAttribute('list', listId);
    const list = document.createElement('datalist');
    list.id = listId;
    const state: LookupState = {
      resolver: createLookupResolver(lookup),
      byLabel: new Map<string, unknown>(),
      original: rawValue(row, column),
      timer: null,
      cleanup: () => {},
    };
    state.cleanup = attachLookupControls(input, list, state, lookup);
    cell.replaceChildren(input, list);
    return { column, input, cell, lookup: state };
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
      entry.lookup?.cleanup();
      entry.cell.classList.remove('sui-grid__cell--editing');
      if (entry.previousTabIndex === null)
        entry.cell.removeAttribute('tabindex');
      else entry.cell.setAttribute('tabindex', entry.previousTabIndex);
      entry.cell.textContent = restore
        ? entry.previousText
        : displayValue(entry);
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
