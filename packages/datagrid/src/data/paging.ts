/**
 * Matematika paging DataGrid (DG-018): halaman ↔ skip/take dan clamp.
 */

export interface PageInfo {
  readonly pageIndex: number;
  readonly pageSize: number;
  readonly skip: number;
  readonly take: number;
  readonly pageCount: number;
}

export function pageCountFor(totalCount: number, pageSize: number): number {
  if (totalCount <= 0 || pageSize <= 0) return 0;
  return Math.ceil(totalCount / pageSize);
}

export function skipForPage(pageIndex: number, pageSize: number): number {
  return Math.max(0, pageIndex) * pageSize;
}

/** Pastikan halaman berada dalam rentang data saat ini. */
export function clampPageIndex(
  pageIndex: number,
  totalCount: number,
  pageSize: number,
): number {
  const pages = pageCountFor(totalCount, pageSize);
  if (pages === 0) return 0;
  return Math.min(Math.max(0, Math.floor(pageIndex)), pages - 1);
}

export function pageForRowIndex(rowIndex: number, pageSize: number): number {
  if (rowIndex < 0 || pageSize <= 0) return 0;
  return Math.floor(rowIndex / pageSize);
}

/** Rentang indeks baris (0-based, end eksklusif) untuk satu halaman. */
export function pageRange(
  totalCount: number,
  pageIndex: number,
  pageSize: number,
): { readonly start: number; readonly end: number } {
  const page = clampPageIndex(pageIndex, totalCount, pageSize);
  const start = skipForPage(page, pageSize);
  return { start, end: Math.min(start + pageSize, Math.max(0, totalCount)) };
}

export function createPageInfo(
  totalCount: number,
  pageIndex: number,
  pageSize: number,
): PageInfo {
  const page = clampPageIndex(pageIndex, totalCount, pageSize);
  return {
    pageIndex: page,
    pageSize,
    skip: skipForPage(page, pageSize),
    take: pageSize,
    pageCount: pageCountFor(totalCount, pageSize),
  };
}

/** Apakah halaman terakhir sudah penuh / data tersisa. */
export function hasNextPage(
  totalCount: number,
  pageIndex: number,
  pageSize: number,
): boolean {
  return pageIndex + 1 < pageCountFor(totalCount, pageSize);
}
