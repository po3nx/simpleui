import type { ColumnState } from '../model/columns.js';

/**
 * Column virtualizer DataGrid (DG-033): prefix sum + binary search, kolom
 * sticky kiri/kanan, dan penanda shadow tepi.
 */

export interface ColumnLayoutEntry<T extends object> {
  readonly column: ColumnState<T>;
  readonly width: number;
  /** Offset kumulatif dari awal daftar kolom. */
  readonly offset: number;
  /** Offset sticky (px) untuk kolom fixed; undefined untuk kolom biasa. */
  readonly stickyOffset: number | undefined;
  readonly fixed: 'start' | 'end' | undefined;
  /** Tepi tempat shadow harus muncul (kolom fixed terakhir/pertama). */
  readonly shadow: 'start' | 'end' | undefined;
}

export interface ColumnLayout<T extends object> {
  readonly columns: readonly ColumnLayoutEntry<T>[];
  readonly totalWidth: number;
  readonly shadowStart: boolean;
  readonly shadowEnd: boolean;
}

interface Parts<T extends object> {
  readonly fixedStart: ColumnLayoutEntry<T>[];
  readonly middle: ColumnLayoutEntry<T>[];
  readonly fixedEnd: ColumnLayoutEntry<T>[];
  readonly totalWidth: number;
}

const DEFAULT_OVERSCAN = 1;

function widthOf(column: { width: number | 'auto'; minWidth: number }): number {
  return column.width === 'auto' ? column.minWidth : column.width;
}

function firstVisible(
  entries: readonly ColumnLayoutEntry<never>[],
  offset: number,
): number {
  let low = 0;
  let high = entries.length;
  while (low < high) {
    const middleIndex = Math.floor((low + high) / 2);
    const entry = entries[middleIndex];
    if (!entry) break;
    if (entry.offset + entry.width <= offset) low = middleIndex + 1;
    else high = middleIndex;
  }
  return low;
}

function partition<T extends object>(
  columns: readonly ColumnState<T>[],
): Parts<T> {
  const fixedStart: ColumnLayoutEntry<T>[] = [];
  const fixedEnd: ColumnLayoutEntry<T>[] = [];
  const middle: ColumnLayoutEntry<T>[] = [];
  let offset = 0;
  let startSticky = 0;

  for (const column of columns) {
    const width = widthOf(column);
    if (column.fixed === 'start') {
      fixedStart.push({
        column,
        width,
        offset,
        stickyOffset: startSticky,
        fixed: 'start',
        shadow: undefined,
      });
      startSticky += width;
    } else if (column.fixed === 'end') {
      fixedEnd.push({
        column,
        width,
        offset,
        stickyOffset: undefined,
        fixed: 'end',
        shadow: undefined,
      });
    } else {
      middle.push({
        column,
        width,
        offset,
        stickyOffset: undefined,
        fixed: undefined,
        shadow: undefined,
      });
    }
    offset += width;
  }

  applyEndSticky(fixedEnd);
  return { fixedStart, middle, fixedEnd, totalWidth: offset };
}

function applyEndSticky<T extends object>(
  entries: ColumnLayoutEntry<T>[],
): void {
  let sticky = 0;
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (!entry) continue;
    entries[index] = { ...entry, stickyOffset: sticky };
    sticky += entry.width;
  }
}

interface WindowContext {
  readonly viewportWidth: number;
  readonly scrollLeft: number;
  readonly overscan: number;
  readonly totalWidth: number;
}

function windowEntries<T extends object>(
  middle: readonly ColumnLayoutEntry<T>[],
  context: WindowContext,
): { entries: readonly ColumnLayoutEntry<T>[]; renderAll: boolean } {
  const { viewportWidth, scrollLeft, overscan, totalWidth } = context;
  const renderAll =
    viewportWidth <= 0 || middle.length === 0 || totalWidth <= viewportWidth;
  if (renderAll) return { entries: middle, renderAll };

  const anchored = middle as unknown as readonly ColumnLayoutEntry<never>[];
  const startIndex = Math.max(0, firstVisible(anchored, scrollLeft) - overscan);
  const endOffset = scrollLeft + viewportWidth;
  let endIndex = startIndex;

  while (endIndex < middle.length) {
    const entry = middle[endIndex];
    if (!entry || entry.offset >= endOffset) break;
    endIndex += 1;
  }

  return {
    entries: middle.slice(
      startIndex,
      Math.min(middle.length, endIndex + overscan),
    ),
    renderAll,
  };
}

function withShadow<T extends object>(
  entries: readonly ColumnLayoutEntry<T>[],
  edge: 'start' | 'end',
  enabled: boolean,
): ColumnLayoutEntry<T>[] {
  return entries.map((entry, index) => {
    const isEdge =
      (edge === 'start' && index === entries.length - 1) ||
      (edge === 'end' && index === 0);
    return enabled && isEdge ? { ...entry, shadow: edge } : entry;
  });
}

export function computeColumnLayout<T extends object>(
  columns: readonly ColumnState<T>[],
  viewportWidth: number,
  scrollLeft: number,
  overscan = DEFAULT_OVERSCAN,
): ColumnLayout<T> {
  const parts = partition(columns);
  const window = windowEntries(parts.middle, {
    viewportWidth,
    scrollLeft,
    overscan,
    totalWidth: parts.totalWidth,
  });
  const shadowStart =
    parts.fixedStart.length > 0 && scrollLeft > 0 && !window.renderAll;
  const shadowEnd =
    parts.fixedEnd.length > 0 &&
    !window.renderAll &&
    scrollLeft + viewportWidth < parts.totalWidth;

  return {
    columns: [
      ...withShadow(parts.fixedStart, 'start', shadowStart),
      ...window.entries,
      ...withShadow(parts.fixedEnd, 'end', shadowEnd),
    ],
    totalWidth: parts.totalWidth,
    shadowStart,
    shadowEnd,
  };
}
