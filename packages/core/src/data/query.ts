import { DataError } from './errors.js';
import type {
  FilterExpression,
  FilterOperator,
  LoadOptions,
  SortDescriptor,
} from './types.js';

/** Batas pipeline lokal (docs/03-data-layer.md §4). */
export const MAX_FILTER_DEPTH = 10;
export const MAX_FILTER_NODES = 200;
export const MAX_IN_VALUES = 1000;
export const MAX_TAKE = 10_000;

export interface NormalizedQuery {
  readonly skip: number;
  readonly take: number | undefined;
  readonly sort: readonly SortDescriptor[];
  readonly filter: FilterExpression | undefined;
}

export type SummaryKind = 'sum' | 'avg' | 'min' | 'max' | 'count';

type OperatorFn = (
  cell: unknown,
  value: unknown,
  collator: Intl.Collator,
) => boolean;

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function foldCase(value: string, collator: Intl.Collator): string {
  return value.toLocaleLowerCase(collator.resolvedOptions().locale);
}

function compareValues(
  a: unknown,
  b: unknown,
  collator: Intl.Collator,
): number {
  const aNumber = asNumber(a);
  const bNumber = asNumber(b);
  if (aNumber !== null && bNumber !== null) return aNumber - bNumber;

  const aText = asText(a);
  const bText = asText(b);
  if (aText === null || bText === null) return 0;
  return collator.compare(aText, bText);
}

const OPERATORS: Record<FilterOperator, OperatorFn> = {
  eq: (cell, value, collator) => compareValues(cell, value, collator) === 0,
  neq: (cell, value, collator) => compareValues(cell, value, collator) !== 0,
  lt: (cell, value, collator) => compareValues(cell, value, collator) < 0,
  lte: (cell, value, collator) => compareValues(cell, value, collator) <= 0,
  gt: (cell, value, collator) => compareValues(cell, value, collator) > 0,
  gte: (cell, value, collator) => compareValues(cell, value, collator) >= 0,
  contains: (cell, value, collator) => {
    const text = asText(cell);
    const needle = asText(value);
    return (
      text !== null &&
      needle !== null &&
      foldCase(text, collator).includes(foldCase(needle, collator))
    );
  },
  notContains: (cell, value, collator) => {
    const text = asText(cell);
    const needle = asText(value);
    return (
      text === null ||
      needle === null ||
      !foldCase(text, collator).includes(foldCase(needle, collator))
    );
  },
  startsWith: (cell, value, collator) => {
    const text = asText(cell);
    const needle = asText(value);
    return (
      text !== null &&
      needle !== null &&
      foldCase(text, collator).startsWith(foldCase(needle, collator))
    );
  },
  endsWith: (cell, value, collator) => {
    const text = asText(cell);
    const needle = asText(value);
    return (
      text !== null &&
      needle !== null &&
      foldCase(text, collator).endsWith(foldCase(needle, collator))
    );
  },
  in: (cell, value) =>
    Array.isArray(value) && value.some((item) => Object.is(item, cell)),
  notIn: (cell, value) =>
    Array.isArray(value) && !value.some((item) => Object.is(item, cell)),
  between: (cell, value, collator) => {
    if (!Array.isArray(value) || value.length !== 2) return false;

    const bounds = value as readonly unknown[];
    return (
      compareValues(cell, bounds[0], collator) >= 0 &&
      compareValues(cell, bounds[1], collator) <= 0
    );
  },
  isNull: (cell) => cell === null || cell === undefined,
  isNotNull: (cell) => cell !== null && cell !== undefined,
};

interface ValidationState {
  nodes: number;
}

function validateNode(
  expression: FilterExpression,
  state: ValidationState,
): void {
  state.nodes += 1;
  if (state.nodes > MAX_FILTER_NODES) {
    throw new DataError('SUI-DATA-007', 'Filter melebihi batas jumlah node.');
  }

  const head = expression[0];
  if (head === 'and' || head === 'or') {
    for (const child of expression.slice(1) as FilterExpression[]) {
      validateNode(child, state);
    }
    return;
  }
  if (head === 'not') {
    validateNode(expression[1] as FilterExpression, state);
    return;
  }

  const [, operator, value] = expression as readonly [
    string,
    FilterOperator,
    unknown,
  ];
  if (!Object.hasOwn(OPERATORS, operator)) {
    throw new DataError(
      'SUI-DATA-007',
      `Operator filter tidak dikenal: ${String(operator)}.`,
    );
  }
  if (
    (operator === 'in' || operator === 'notIn') &&
    Array.isArray(value) &&
    value.length > MAX_IN_VALUES
  ) {
    throw new DataError('SUI-DATA-007', 'Daftar nilai filter melebihi batas.');
  }
}

/** Validasi AST filter: kedalaman, jumlah node, operator, dan ukuran `in`. */
export function validateFilter(expression: FilterExpression | undefined): void {
  if (!expression) return;

  const walk = (node: FilterExpression, level: number): void => {
    if (level > MAX_FILTER_DEPTH) {
      throw new DataError('SUI-DATA-007', 'Filter terlalu dalam.');
    }

    const head = node[0];
    if (head === 'and' || head === 'or') {
      for (const child of node.slice(1) as FilterExpression[]) {
        walk(child, level + 1);
      }
      return;
    }
    if (head === 'not') walk(node[1] as FilterExpression, level + 1);
  };

  walk(expression, 1);
  validateNode(expression, { nodes: 0 });
}

/** Normalisasi dan validasi `LoadOptions` (SUI-DATA-001/006). */
export function normalizeOptions(options: LoadOptions): NormalizedQuery {
  const skip = options.skip ?? 0;
  if (!Number.isInteger(skip) || skip < 0) {
    throw new DataError('SUI-DATA-001', 'skip harus bilangan bulat >= 0.');
  }

  const take = options.take;
  if (take !== undefined) {
    if (!Number.isInteger(take) || take < 1) {
      throw new DataError('SUI-DATA-001', 'take harus bilangan bulat >= 1.');
    }
    if (take > MAX_TAKE) {
      throw new DataError('SUI-DATA-006', `take melebihi batas ${MAX_TAKE}.`);
    }
  }

  validateFilter(options.filter);

  const sort = options.sort ?? [];
  for (const descriptor of sort) {
    if (descriptor.selector.length === 0) {
      throw new DataError('SUI-DATA-001', 'selector sort tidak boleh kosong.');
    }
  }

  return { skip, take, sort, filter: options.filter };
}

/** Terapkan filter AST ke baris; null/undefined dianggap sama (isNull). */
export function applyFilter<T extends object>(
  rows: readonly T[],
  expression: FilterExpression | undefined,
  collator: Intl.Collator,
): readonly T[] {
  if (!expression) return rows;

  const matches = (row: T, node: FilterExpression): boolean => {
    const head = node[0];

    if (head === 'and') {
      return (node.slice(1) as FilterExpression[]).every((child) =>
        matches(row, child),
      );
    }
    if (head === 'or') {
      return (node.slice(1) as FilterExpression[]).some((child) =>
        matches(row, child),
      );
    }
    if (head === 'not') return !matches(row, node[1] as FilterExpression);

    const [field, operator, value] = node as readonly [
      string,
      FilterOperator,
      unknown,
    ];
    const cell = (row as Record<string, unknown>)[field];
    return OPERATORS[operator](cell, value, collator);
  };

  return rows.filter((row) => matches(row, expression));
}

/** Sort stabil multi-kolom; null selalu di akhir. */
export function applySort<T extends object>(
  rows: readonly T[],
  sort: readonly SortDescriptor[] | undefined,
  collator: Intl.Collator,
): readonly T[] {
  if (!sort || sort.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const descriptor of sort) {
      const left = (a as Record<string, unknown>)[descriptor.selector];
      const right = (b as Record<string, unknown>)[descriptor.selector];
      const leftNull = left === null || left === undefined;
      const rightNull = right === null || right === undefined;

      if (leftNull && rightNull) continue;
      if (leftNull) return 1;
      if (rightNull) return -1;

      const comparison = compareValues(left, right, collator);
      if (comparison !== 0) return descriptor.desc ? -comparison : comparison;
    }
    return 0;
  });
}

/** Potong hasil setelah filter/sort; total count memakai panjang sebelum page. */
export function applyPage<T>(
  rows: readonly T[],
  skip: number,
  take: number | undefined,
): readonly T[] {
  if (take === undefined) return skip === 0 ? rows : rows.slice(skip);
  return rows.slice(skip, skip + take);
}

/** Agregasi numerik; nilai non-finite diabaikan. */
export function summarize<T extends object>(
  rows: readonly T[],
  selector: string,
  kind: SummaryKind,
): number {
  if (kind === 'count') return rows.length;

  const values = rows
    .map((row) => (row as Record<string, unknown>)[selector])
    .filter((value): value is number => asNumber(value) !== null);

  if (values.length === 0) return 0;

  switch (kind) {
    case 'sum':
      return values.reduce((total, value) => total + value, 0);
    case 'avg':
      return values.reduce((total, value) => total + value, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
  }
}

/** Jalankan pipeline lokal: normalize → filter → sort → page. */
export function runQuery<T extends object>(
  rows: readonly T[],
  options: LoadOptions,
  collator: Intl.Collator,
): { data: readonly T[]; totalCount: number } {
  const query = normalizeOptions(options);
  const filtered = applyFilter(rows, query.filter, collator);
  const sorted = applySort(filtered, query.sort, collator);

  return {
    data: applyPage(sorted, query.skip, query.take),
    totalCount: filtered.length,
  };
}
