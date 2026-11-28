import type { ColumnState } from '../model/columns.js';
import {
  flattenGroups,
  groupRows,
  type GroupOptions,
  type GroupNode,
} from '../data/grouping.js';

/**
 * Representasi baris grup untuk renderer (DG-066): entri grup + baris data
 * yang sudah diflatten sesuai state expand.
 */

export type GroupDisplayEntry<T extends object> =
  | {
      readonly type: 'group';
      readonly node: GroupNode<T>;
      readonly expanded: boolean;
    }
  | { readonly type: 'row'; readonly row: T };

export interface GroupViewOptions<T extends object> {
  readonly groupBy?: readonly string[] | undefined;
  readonly expandedGroups?: Iterable<string> | undefined;
  readonly grouping?: GroupOptions | undefined;
  readonly columns: readonly ColumnState<T>[];
  readonly keyOf: (row: T) => string | number;
}

export function buildGroupEntries<T extends object>(
  rows: readonly T[],
  options: GroupViewOptions<T>,
): readonly GroupDisplayEntry<T>[] {
  const groupBy = options.groupBy ?? [];
  if (groupBy.length === 0) {
    return rows.map((row) => ({ type: 'row', row }));
  }
  const groups = groupRows(rows, groupBy, options.grouping);
  const expanded =
    options.expandedGroups instanceof Set
      ? options.expandedGroups
      : new Set(options.expandedGroups ?? []);
  return flattenGroups(groups, expanded, false).map((entry) =>
    entry.type === 'group'
      ? { type: 'group', node: entry.node, expanded: entry.expanded }
      : { type: 'row', row: entry.row },
  );
}

export function groupCaption<T extends object>(
  node: GroupNode<T>,
  columns: readonly ColumnState<T>[],
): string {
  const column = columns.find(
    (entry) => (entry.dataField ?? entry.id) === node.field,
  );
  return column?.caption ?? node.field;
}

export function groupLabel<T extends object>(
  node: GroupNode<T>,
  columns: readonly ColumnState<T>[],
): string {
  const value =
    node.value === null || node.value === undefined
      ? '(kosong)'
      : String(node.value);
  return `${groupCaption(node, columns)}: ${value} (${node.count})`;
}
