import type { Key } from '@simpleui/core';
import type { ColumnState } from '../model/columns.js';
import type { GroupDisplayEntry } from './group-view.js';

/**
 * Master-detail row (DG-068): baris detail full-width setelah baris induk,
 * status loading/error, template konsumen, dan load async.
 */

export interface DetailContext<T extends object> {
  readonly row: T;
  readonly key: Key;
  readonly data: unknown;
  readonly status: 'loading' | 'loaded' | 'error';
}

export interface MasterDetailOptions<T extends object> {
  readonly enabled?: boolean;
  readonly load?: (row: T, key: Key) => Promise<unknown>;
  readonly template?: (
    container: HTMLElement,
    context: DetailContext<T>,
  ) => void;
  readonly loadingText?: string;
  readonly errorText?: string;
}

export interface DetailState {
  readonly status: 'loading' | 'loaded' | 'error';
  readonly data?: unknown;
  readonly error?: unknown;
}

export type DisplayEntry<T extends object> =
  | GroupDisplayEntry<T>
  | { readonly type: 'detail'; readonly row: T; readonly key: Key };

export function expandDetails<T extends object>(
  entries: readonly GroupDisplayEntry<T>[],
  expanded: ReadonlySet<string>,
  states: ReadonlyMap<Key, DetailState>,
  keyOf: (row: T) => Key,
): readonly DisplayEntry<T>[] {
  const output: DisplayEntry<T>[] = [];
  for (const entry of entries) {
    output.push(entry);
    if (entry.type !== 'row') continue;
    const key = keyOf(entry.row);
    if (!expanded.has(String(key)) || !states.has(key)) continue;
    output.push({ type: 'detail', row: entry.row, key });
  }
  return output;
}

export interface DetailRowContext<T extends object> {
  readonly element: HTMLElement;
  readonly row: T;
  readonly key: Key;
  readonly index: number;
  readonly totalWidth: number;
  readonly columns: readonly ColumnState<T>[];
  readonly state: DetailState;
  readonly options: MasterDetailOptions<T>;
}

export function paintDetailRow<T extends object>(
  context: DetailRowContext<T>,
): void {
  const { element, index, totalWidth, columns, state, options, row, key } =
    context;
  element.hidden = false;
  element.className = 'sui-grid__row sui-grid__row--detail';
  element.setAttribute('role', 'row');
  element.setAttribute('aria-rowindex', String(index + 1));
  element.setAttribute('data-detail-key', String(key));
  const cell = document.createElement('div');
  cell.className = 'sui-grid__cell sui-grid__cell--detail';
  cell.setAttribute('role', 'gridcell');
  cell.setAttribute('aria-colindex', '1');
  cell.setAttribute('aria-colspan', String(columns.length));
  cell.style.flexBasis = `${totalWidth}px`;
  const content = document.createElement('div');
  content.className = 'sui-grid__detail-content';
  if (state.status === 'loading') {
    content.setAttribute('role', 'status');
    content.textContent = options.loadingText ?? 'Memuat detail…';
  } else if (state.status === 'error') {
    content.setAttribute('role', 'alert');
    content.textContent = options.errorText ?? 'Gagal memuat detail.';
  } else if (options.template) {
    options.template(content, {
      row,
      key,
      data: state.data,
      status: state.status,
    });
  } else {
    content.textContent = state.data === undefined ? '' : String(state.data);
  }
  cell.append(content);
  element.replaceChildren(cell);
}
