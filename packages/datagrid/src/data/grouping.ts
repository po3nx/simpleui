import { DataGridError } from '../errors.js';

/**
 * Grouping DataGrid (DG-016): grup hierarkis multi-field, batas jumlah grup
 * per level, dan flatten sesuai state ekspansi.
 */

export interface GroupNode<T extends object> {
  readonly key: string;
  readonly field: string;
  readonly value: unknown;
  readonly depth: number;
  readonly count: number;
  readonly rows: readonly T[];
  readonly children: readonly GroupNode<T>[] | undefined;
}

export interface GroupOptions {
  /** Batas jumlah grup per level; default 100. */
  readonly maxGroupCount?: number;
}

export type GroupedEntry<T extends object> =
  | {
      readonly type: 'group';
      readonly node: GroupNode<T>;
      readonly expanded: boolean;
    }
  | { readonly type: 'row'; readonly row: T; readonly depth: number };

const DEFAULT_MAX_GROUP_COUNT = 100;

function fail(message: string): never {
  throw new DataGridError('SUI-DG-009', message);
}

function valueKey(value: unknown): string {
  if (value === null || value === undefined) return 'n';
  if (typeof value === 'number') return `n:${value}`;
  if (typeof value === 'boolean') return `b:${value}`;
  if (typeof value === 'string') return `s:${encodeURIComponent(value)}`;
  return `o:${String(value)}`;
}

/** Key grup stabil dari jalur nilai (multi-level). */
export function groupKey(pathValues: readonly unknown[]): string {
  return pathValues.map(valueKey).join('|');
}

function assertMaxGroupCount(maxGroupCount: number): number {
  if (!Number.isInteger(maxGroupCount) || maxGroupCount < 1) {
    throw new DataGridError(
      'SUI-DG-001',
      'maxGroupCount harus bilangan bulat >= 1.',
    );
  }
  return maxGroupCount;
}

function bucketRows<T extends object>(
  rows: readonly T[],
  field: string,
): Map<string, { value: unknown; rows: T[] }> {
  const buckets = new Map<string, { value: unknown; rows: T[] }>();

  for (const row of rows) {
    const value = (row as Record<string, unknown>)[field];
    const key = valueKey(value);
    const bucket = buckets.get(key);
    if (bucket) bucket.rows.push(row);
    else buckets.set(key, { value, rows: [row] });
  }

  return buckets;
}

interface LevelContext {
  readonly depth: number;
  readonly path: readonly unknown[];
  readonly maxGroupCount: number;
}

function buildLevel<T extends object>(
  rows: readonly T[],
  fields: readonly string[],
  context: LevelContext,
): readonly GroupNode<T>[] {
  const field = fields[context.depth];
  if (!field) return [];

  const buckets = bucketRows(rows, field);
  if (buckets.size > context.maxGroupCount) {
    fail(
      `Jumlah grup pada level ${context.depth + 1} melebihi batas ${context.maxGroupCount}.`,
    );
  }

  return [...buckets.values()].map((bucket) => {
    const values = [...context.path, bucket.value];
    const children =
      context.depth + 1 < fields.length
        ? buildLevel(bucket.rows, fields, {
            depth: context.depth + 1,
            path: values,
            maxGroupCount: context.maxGroupCount,
          })
        : undefined;

    return {
      key: groupKey(values),
      field,
      value: bucket.value,
      depth: context.depth,
      count: bucket.rows.length,
      rows: bucket.rows,
      children,
    };
  });
}

/** Bangun pohon grup; urutan grup mengikuti kemunculan pertama. */
export function groupRows<T extends object>(
  rows: readonly T[],
  groupBy: readonly string[],
  options: GroupOptions = {},
): readonly GroupNode<T>[] {
  if (groupBy.length === 0 || rows.length === 0) return [];
  const maxGroupCount = assertMaxGroupCount(
    options.maxGroupCount ?? DEFAULT_MAX_GROUP_COUNT,
  );

  return buildLevel(rows, groupBy, { depth: 0, path: [], maxGroupCount });
}

function appendEntry<T extends object>(
  node: GroupNode<T>,
  expanded: ReadonlySet<string>,
  autoExpandAll: boolean,
  output: GroupedEntry<T>[],
): void {
  const isExpanded = autoExpandAll || expanded.has(node.key);
  output.push({ type: 'group', node, expanded: isExpanded });
  if (!isExpanded) return;

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      appendEntry(child, expanded, autoExpandAll, output);
    }
    return;
  }

  for (const row of node.rows) {
    output.push({ type: 'row', row, depth: node.depth + 1 });
  }
}

/** Ratakan grup menjadi header grup + baris yang terlihat. */
export function flattenGroups<T extends object>(
  nodes: readonly GroupNode<T>[],
  expanded: Iterable<string> = [],
  autoExpandAll = false,
): readonly GroupedEntry<T>[] {
  const expandedSet = expanded instanceof Set ? expanded : new Set(expanded);
  const output: GroupedEntry<T>[] = [];

  for (const node of nodes) {
    appendEntry(node, expandedSet, autoExpandAll, output);
  }

  return output;
}
