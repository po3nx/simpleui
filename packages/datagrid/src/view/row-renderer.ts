import { Virtualizer, type Key } from '@simpleui/core';

import { getVisibleColumns, type ColumnState } from '../model/columns.js';
import { cellValueFor, formatRowCell } from './cell-renderer.js';
import { createLookupCellState, lookupText } from './lookup-cell.js';
import type { FocusModel } from '../model/focus.js';
import {
  createCellEditor,
  type CellEditor,
  type EditingUiOptions,
} from './cell-editor.js';
import { keyToDomId } from '../model/key.js';
import { attachGridKeyboard } from './keyboard.js';
import { TemplateManager } from './template-manager.js';
import { buildGroupEntries, type GroupDisplayEntry } from './group-view.js';
import { paintGroupRow } from './group-row.js';
import type { GroupOptions } from '../data/grouping.js';
import {
  computeColumnLayout,
  type ColumnLayoutEntry,
} from './column-virtualizer.js';

/**
 * Row renderer DataGrid (DG-032): virtualisasi baris, daur ulang node, dan
 * scroll anchoring saat data berubah.
 */

export interface RowRendererOptions<T extends object> {
  readonly gridElement: HTMLElement;
  readonly viewportElement: HTMLElement;
  readonly spacerElement: HTMLElement;
  readonly rowsElement: HTMLElement;
  readonly columns: readonly ColumnState<T>[];
  readonly rows: readonly T[];
  readonly keyOf: (row: T) => Key;
  readonly rowHeight?: number;
  readonly overscan?: number;
  readonly locale?: string;
  readonly emptyText?: string;
  readonly onTemplateError?: (
    error: unknown,
    phase: 'render' | 'update' | 'dispose',
  ) => void;
  readonly focus?: FocusModel | undefined;
  readonly liveElement?: HTMLElement | undefined;
  readonly rtl?: boolean | undefined;
  readonly editing?: EditingUiOptions<T> | undefined;
  readonly groupBy?: readonly string[] | undefined;
  readonly expandedGroups?: Iterable<string> | undefined;
  readonly grouping?: GroupOptions | undefined;
  readonly onGroupToggle?:
    ((groupKey: string, expanded: boolean) => void) | undefined;
  readonly isSelected?: ((row: T) => boolean) | undefined;
  readonly selectionChanges?:
    ((listener: () => void) => () => void) | undefined;
}

export interface RowRenderer<T extends object> {
  setRows(rows: readonly T[]): void;
  setColumns(columns: readonly ColumnState<T>[]): void;
  getRenderedCount(): number;
  setLocale(locale: string | undefined): void;
  setGrouping(groupBy: readonly string[], expanded: Iterable<string>): void;
  toggleGroup(groupKey: string): void;
  dispose(): void;
}

const DEFAULT_ROW_HEIGHT = 40;
const FALLBACK_VIEWPORT = 320;

interface Anchor {
  readonly key: Key;
  readonly offset: number;
}

function justifyFor(alignment: ColumnState['alignment']): string {
  if (alignment === 'end') return 'flex-end';
  if (alignment === 'center') return 'center';
  return 'flex-start';
}

function createCell<T extends object>(
  entry: ColumnLayoutEntry<T>,
  columnIndex: number,
): HTMLElement {
  const cell = document.createElement('div');
  cell.className = 'sui-grid__cell';
  cell.setAttribute('role', 'gridcell');
  cell.setAttribute('aria-colindex', String(columnIndex));
  cell.setAttribute('data-column-id', entry.column.id);
  cell.style.flexBasis = `${entry.width}px`;
  cell.style.justifyContent = justifyFor(entry.column.alignment);

  if (entry.fixed && entry.stickyOffset !== undefined) {
    cell.classList.add(`sui-grid__cell--sticky-${entry.fixed}`);
    cell.style.position = 'sticky';
    cell.style[
      entry.fixed === 'start' ? 'insetInlineStart' : 'insetInlineEnd'
    ] = `${entry.stickyOffset}px`;
    cell.style.zIndex = '1';
  }
  if (entry.shadow) {
    cell.classList.add(`sui-grid__cell--shadow-${entry.shadow}`);
  }

  return cell;
}

class VirtualRowRenderer<T extends object> implements RowRenderer<T> {
  readonly #options: RowRendererOptions<T>;
  readonly #rowHeight: number;
  readonly #overscan: number;
  readonly #virtualizer: Virtualizer;
  readonly #pool: HTMLElement[] = [];
  #rows: readonly T[];
  #columns: readonly ColumnState<T>[];
  #locale: string | undefined;
  readonly #widths = new Map<string, number>();
  readonly #lookupState = createLookupCellState();
  #groupBy: readonly string[];
  readonly #expanded: Set<string>;
  #entries: readonly GroupDisplayEntry<T>[];

  #layoutSignature = '';
  #disposed = false;
  readonly #templates: TemplateManager;
  readonly #detachKeyboard: (() => void) | undefined;
  readonly #unsubscribeSelection: (() => void) | undefined;
  readonly #editor: CellEditor<T> | undefined;

  constructor(options: RowRendererOptions<T>) {
    this.#options = options;
    this.#rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;
    this.#overscan = options.overscan ?? 5;
    this.#rows = options.rows;
    this.#columns = getVisibleColumns(options.columns);
    this.#locale = options.locale;
    this.#groupBy = options.groupBy ?? [];
    this.#expanded = new Set(options.expandedGroups ?? []);
    this.#entries = this.#buildEntries();
    this.#templates = new TemplateManager(
      options.onTemplateError ? { onError: options.onTemplateError } : {},
    );
    this.#detachKeyboard = this.#attachKeyboard();
    this.#editor = options.editing
      ? createCellEditor(options.editing, this.#columns)
      : undefined;
    this.#unsubscribeSelection = options.selectionChanges?.(() =>
      this.#render(),
    );
    this.#virtualizer = this.#createVirtualizer();
    if (this.#editor) {
      options.rowsElement.addEventListener('dblclick', this.#onDblClick);
      options.gridElement.addEventListener('keydown', this.#onEditorKeyDown);
    }
    options.viewportElement.addEventListener('scroll', this.#onScroll, {
      passive: true,
    });
    options.gridElement.addEventListener(
      'simpleui:column-resize',
      this.#onColumnResize as EventListener,
    );
    this.#updateSpacer();
    this.#render();
  }
  readonly #onScroll = (): void => this.#render();
  readonly #onDblClick = (event: MouseEvent): void => {
    const cell = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '.sui-grid__cell',
    );
    const rowElement = cell?.closest<HTMLElement>('.sui-grid__row');
    if (!cell || !rowElement) return;
    this.#beginEdit(rowElement, cell);
  };

  readonly #onEditorKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'F2' && event.key !== 'Enter') return;
    const active = document.activeElement as HTMLElement | null;
    if (active?.closest('.sui-grid__editor')) return;
    const cell = active?.closest<HTMLElement>('.sui-grid__cell');
    const rowElement = cell?.closest<HTMLElement>('.sui-grid__row');
    if (!cell || !rowElement) return;
    if (this.#beginEdit(rowElement, cell)) event.preventDefault();
  };

  #beginEdit(rowElement: HTMLElement, cell: HTMLElement): boolean {
    const key = rowElement.getAttribute('data-row-key');
    const row = this.#rows.find(
      (entry) => String(this.#options.keyOf(entry)) === key,
    );
    if (!row) return false;
    return (
      this.#editor?.begin(
        rowElement,
        row,
        cell.getAttribute('data-column-id'),
      ) ?? false
    );
  }

  readonly #onColumnResize = (
    event: CustomEvent<{ columnId: string; width: number }>,
  ): void => {
    const detail = event.detail;
    if (!detail) return;
    this.#widths.set(detail.columnId, detail.width);
    this.#render();
  };

  #effectiveColumns(): readonly ColumnState<T>[] {
    if (this.#widths.size === 0) return this.#columns;
    return this.#columns.map((column) => {
      const width = this.#widths.get(column.id);
      return width === undefined ? column : { ...column, width };
    });
  }

  #createVirtualizer(): Virtualizer {
    return new Virtualizer({
      itemCount: this.#rows.length,
      itemSize: this.#rowHeight,
      viewportSize: FALLBACK_VIEWPORT,
      overscan: this.#overscan,
    });
  }

  #attachKeyboard(): (() => void) | undefined {
    const focus = this.#options.focus;
    if (!focus) return undefined;
    return attachGridKeyboard({
      element: this.#options.gridElement,
      viewportElement: this.#options.viewportElement,
      focus,
      getRowKeys: () => this.#rows.map((row) => this.#options.keyOf(row)),
      rowHeight: this.#rowHeight,
      liveElement: this.#options.liveElement,
      rtl: this.#options.rtl,
    });
  }

  #viewportSize(): number {
    const size = this.#options.viewportElement.clientHeight;
    return size > 0 ? size : FALLBACK_VIEWPORT;
  }

  #updateSpacer(): void {
    this.#options.spacerElement.style.blockSize = `${this.#rows.length * this.#rowHeight}px`;
    this.#options.gridElement.setAttribute(
      'aria-rowcount',
      String(this.#entries.length),
    );
  }

  #captureAnchor(): Anchor | null {
    if (this.#rows.length === 0 || this.#groupBy.length > 0) return null;
    const scrollTop = this.#options.viewportElement.scrollTop;
    const index = Math.min(
      Math.floor(scrollTop / this.#rowHeight),
      this.#rows.length - 1,
    );
    const row = this.#rows[index];
    if (!row) return null;
    return {
      key: this.#options.keyOf(row),
      offset: scrollTop - index * this.#rowHeight,
    };
  }

  #restoreAnchor(anchor: Anchor): void {
    const index = this.#rows.findIndex((row) =>
      Object.is(this.#options.keyOf(row), anchor.key),
    );
    if (index < 0) return;
    this.#options.viewportElement.scrollTop =
      index * this.#rowHeight + anchor.offset;
  }

  #layout(): {
    entries: readonly ColumnLayoutEntry<T>[];
    totalWidth: number;
  } {
    const layout = computeColumnLayout(
      this.#effectiveColumns(),
      this.#options.viewportElement.clientWidth,
      this.#options.viewportElement.scrollLeft,
    );
    return { entries: layout.columns, totalWidth: layout.totalWidth };
  }

  #columnIndex(columnId: string): number {
    return this.#columns.findIndex((column) => column.id === columnId) + 1;
  }

  #syncCells(entries: readonly ColumnLayoutEntry<T>[]): boolean {
    const signature = entries
      .map((entry) => `${entry.column.id}:${entry.width}`)
      .join('|');
    if (signature === this.#layoutSignature) return false;

    this.#templates.clear();
    this.#pool.forEach((rowElement) => {
      rowElement.replaceChildren();
      entries.forEach((entry) => {
        rowElement.append(
          createCell(entry, this.#columnIndex(entry.column.id)),
        );
      });
    });
    this.#layoutSignature = signature;
    return true;
  }

  #render(): void {
    if (this.#disposed) return;
    const layout = this.#layout();
    this.#virtualizer.setViewportSize(this.#viewportSize());
    this.#virtualizer.setItemCount(this.#entries.length);
    this.#virtualizer.setScrollOffset(this.#options.viewportElement.scrollTop);

    const { start, end, offsetTop } = this.#virtualizer.range;
    const count = Math.max(0, end - start);
    this.#ensurePool(count);
    this.#syncCells(layout.entries);
    this.#options.rowsElement.style.transform = `translateY(${offsetTop}px)`;
    this.#options.rowsElement.style.minInlineSize = `${layout.totalWidth}px`;
    this.#options.spacerElement.style.inlineSize = `${layout.totalWidth}px`;

    this.#pool.forEach((rowElement, poolIndex) => {
      const entry = this.#entries[start + poolIndex];
      if (poolIndex >= count || !entry) {
        rowElement.hidden = true;
        return;
      }
      if (entry.type === 'group') {
        paintGroupRow({
          rowElement,
          entry,
          index: start + poolIndex,
          totalWidth: layout.totalWidth,
          columns: this.#columns,
          onToggle: (key) => this.toggleGroup(key),
        });
      } else {
        this.#paintRow(
          rowElement,
          entry.row,
          start + poolIndex,
          layout.entries,
        );
      }
    });
  }

  #buildEntries(): readonly GroupDisplayEntry<T>[] {
    return buildGroupEntries(this.#rows, {
      groupBy: this.#groupBy,
      expandedGroups: this.#expanded,
      grouping: this.#options.grouping,
      columns: this.#columns,
      keyOf: this.#options.keyOf,
    });
  }

  setGrouping(groupBy: readonly string[], expanded: Iterable<string>): void {
    this.#groupBy = groupBy;
    this.#expanded.clear();
    for (const key of expanded) this.#expanded.add(key);
    this.#entries = this.#buildEntries();
    this.#updateSpacer();
    this.#render();
  }

  toggleGroup(groupKey: string): void {
    const expanded = !this.#expanded.has(groupKey);
    if (expanded) this.#expanded.add(groupKey);
    else this.#expanded.delete(groupKey);
    this.#options.onGroupToggle?.(groupKey, expanded);
    if (this.#groupBy.length === 0) return;
    this.#entries = this.#buildEntries();
    this.#updateSpacer();
    this.#render();
  }

  #paintRow(
    rowElement: HTMLElement,
    row: T,
    index: number,
    entries: readonly ColumnLayoutEntry<T>[],
  ): void {
    if (rowElement.children.length !== entries.length) {
      rowElement.replaceChildren();
      entries.forEach((entry) => {
        rowElement.append(
          createCell(entry, this.#columnIndex(entry.column.id)),
        );
      });
    }
    rowElement.hidden = false;
    rowElement.className = 'sui-grid__row';
    rowElement.setAttribute('aria-rowindex', String(index + 1));
    const rowKey = this.#options.keyOf(row);
    rowElement.setAttribute('data-row-key', String(rowKey));
    rowElement.classList.toggle('sui-grid__row--even', index % 2 === 1);
    if (this.#options.isSelected) {
      rowElement.setAttribute(
        'aria-selected',
        String(this.#options.isSelected(row)),
      );
    }

    entries.forEach((entry, cellIndex) => {
      const cell = rowElement.children[cellIndex] as HTMLElement | undefined;
      if (cell) this.#paintCell({ row, rowKey, index, entry, cell });
    });
  }

  #paintCell(context: {
    readonly row: T;
    readonly rowKey: Key;
    readonly index: number;
    readonly entry: ColumnLayoutEntry<T>;
    readonly cell: HTMLElement;
  }): void {
    const { row, rowKey, index, entry, cell } = context;
    cell.id = `${keyToDomId(rowKey)}-${encodeURIComponent(entry.column.id)}`;
    if (!cell.hasAttribute('tabindex')) cell.tabIndex = -1;

    const template = entry.column.cellTemplate;
    if (template) {
      this.#templates.mount(cell, template, {
        data: row,
        row,
        column: {
          field: entry.column.dataField ?? entry.column.id,
          caption: entry.column.caption,
        },
        index,
        value: cellValueFor(row, entry.column),
      });
      return;
    }

    this.#templates.unmount(cell);
    const value = cellValueFor(row, entry.column);
    const label = entry.column.lookup
      ? lookupText(entry.column, value, this.#lookupState, () => this.#render())
      : undefined;
    const text =
      label ??
      formatRowCell(row, entry.column, {
        locale: this.#locale,
        placeholder: this.#options.emptyText,
      });
    if (cell.textContent !== text) cell.textContent = text;
  }

  #ensurePool(size: number): void {
    while (this.#pool.length < size) {
      const rowElement = document.createElement('div');
      rowElement.className = 'sui-grid__row';
      rowElement.setAttribute('role', 'row');
      this.#options.rowsElement.append(rowElement);
      this.#pool.push(rowElement);
    }
  }

  setRows(next: readonly T[]): void {
    if (this.#disposed) return;
    this.#editor?.cancel();
    const anchor = this.#captureAnchor();
    this.#rows = next;
    this.#entries = this.#buildEntries();
    this.#updateSpacer();
    if (anchor) this.#restoreAnchor(anchor);
    this.#render();
  }

  setColumns(next: readonly ColumnState<T>[]): void {
    if (this.#disposed) return;
    this.#columns = getVisibleColumns(next);
    this.#entries = this.#buildEntries();
    this.#templates.clear();
    this.#pool.forEach((rowElement) => rowElement.remove());
    this.#pool.length = 0;
    this.#layoutSignature = '';
    this.#render();
  }

  getRenderedCount(): number {
    return this.#pool.filter((row) => !row.hidden).length;
  }

  setLocale(locale: string | undefined): void {
    this.#locale = locale;
    this.#render();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#options.viewportElement.removeEventListener('scroll', this.#onScroll);
    this.#detachKeyboard?.();
    this.#unsubscribeSelection?.();
    this.#options.gridElement.removeEventListener(
      'simpleui:column-resize',
      this.#onColumnResize as EventListener,
    );
    this.#options.rowsElement.removeEventListener('dblclick', this.#onDblClick);
    this.#options.gridElement.removeEventListener(
      'keydown',
      this.#onEditorKeyDown,
    );
    this.#editor?.dispose();
    this.#templates.dispose();
    this.#pool.forEach((rowElement) => rowElement.remove());
    this.#pool.length = 0;
  }
}

export function createRowRenderer<T extends object>(
  options: RowRendererOptions<T>,
): RowRenderer<T> {
  return new VirtualRowRenderer(options);
}
