import {
  createVirtualizer,
  type VirtualAlign,
  type VirtualRange,
} from '@simpleui/core';

/**
 * Matematika scroll virtual DataGrid (DG-018) di atas `Virtualizer` core.
 * Model bersifat stateful hanya untuk posisi scroll; perhitungan O(1).
 */

export interface VirtualScrollOptions {
  readonly rowCount: number;
  readonly rowHeight: number;
  readonly viewportSize: number;
  readonly overscan?: number;
}

export interface VirtualScrollModel {
  readonly rowCount: number;
  readonly rowHeight: number;
  readonly totalHeight: number;
  range(scrollOffset: number): VirtualRange;
  rowAtOffset(offset: number): number | null;
  offsetForRow(index: number, align?: VirtualAlign): number;
  offsetForPage(pageIndex: number, pageSize: number): number;
}

export function createVirtualScroll(
  options: VirtualScrollOptions,
): VirtualScrollModel {
  const virtualizer = createVirtualizer({
    itemCount: options.rowCount,
    itemSize: options.rowHeight,
    viewportSize: options.viewportSize,
    ...(options.overscan === undefined ? {} : { overscan: options.overscan }),
  });

  return {
    rowCount: options.rowCount,
    rowHeight: options.rowHeight,
    totalHeight: options.rowCount * options.rowHeight,

    range(scrollOffset) {
      virtualizer.setScrollOffset(scrollOffset);
      return virtualizer.range;
    },

    rowAtOffset: (offset) => virtualizer.indexAt(offset),

    offsetForRow: (index, align = 'start') =>
      virtualizer.scrollToIndex(index, align),

    offsetForPage(pageIndex, pageSize) {
      const index = Math.max(0, pageIndex) * pageSize;
      return virtualizer.scrollToIndex(index, 'start');
    },
  };
}
