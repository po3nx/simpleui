import type { ColumnState } from '../model/columns.js';

/**
 * Reorder kolom DataGrid (DG-038): urutan berbasis id, drag, dan keyboard.
 */

export function visibleColumnIds<T extends object>(
  columns: readonly ColumnState<T>[],
): string[] {
  return columns
    .filter((column) => column.visible && !column.children)
    .map((column) => column.id);
}

export function moveColumn(
  order: readonly string[],
  id: string,
  delta: -1 | 1,
): string[] {
  const index = order.indexOf(id);
  if (index < 0) return [...order];
  const target = index + delta;
  if (target < 0 || target >= order.length) return [...order];
  const next = [...order];
  const [moved] = next.splice(index, 1);
  if (!moved) return [...order];
  next.splice(target, 0, moved);
  return next;
}

export function moveColumnTo(
  order: readonly string[],
  id: string,
  targetId: string,
  position: 'before' | 'after' = 'before',
): string[] {
  if (id === targetId) return [...order];
  const without = order.filter((entry) => entry !== id);
  const targetIndex = without.indexOf(targetId);
  if (targetIndex < 0) return [...order];
  const insertAt = position === 'after' ? targetIndex + 1 : targetIndex;
  return [...without.slice(0, insertAt), id, ...without.slice(insertAt)];
}

/** Terapkan urutan id ke kolom top-level; id yang tidak dikenal diabaikan. */
export function applyColumnOrder<T extends object>(
  columns: readonly ColumnState<T>[],
  order: readonly string[],
): ColumnState<T>[] {
  const byId = new Map(columns.map((column) => [column.id, column]));
  const ordered: ColumnState<T>[] = [];
  for (const id of order) {
    const column = byId.get(id);
    if (!column) continue;
    ordered.push(column);
    byId.delete(id);
  }
  return [...ordered, ...byId.values()];
}
