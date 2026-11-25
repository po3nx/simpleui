import {
  applyFilter,
  MAX_IN_VALUES,
  validateFilter,
  type FilterExpression,
  type FilterOperator,
} from '@simpleui/core';

import type { ColumnDataType } from '../api/types.js';
import { DataGridError } from '../errors.js';
import type { ColumnState } from '../model/columns.js';

/**
 * Filter pipeline DataGrid (DG-014): operator per tipe kolom, validasi operand,
 * filter row, pencarian, dan penerapan lewat pipeline core (AST tertutup).
 */

export interface FilterRowValue {
  readonly operator?: FilterOperator;
  readonly value?: unknown;
}

export type FilterRowValues = Readonly<Record<string, FilterRowValue>>;

const TEXT_OPERATORS: readonly FilterOperator[] = [
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'eq',
  'neq',
  'in',
  'notIn',
  'isNull',
  'isNotNull',
];

const ORDERED_OPERATORS: readonly FilterOperator[] = [
  'eq',
  'neq',
  'lt',
  'lte',
  'gt',
  'gte',
  'between',
  'in',
  'notIn',
  'isNull',
  'isNotNull',
];

const BOOLEAN_OPERATORS: readonly FilterOperator[] = [
  'eq',
  'neq',
  'isNull',
  'isNotNull',
];

const NULL_OPERATORS = new Set<FilterOperator>(['isNull', 'isNotNull']);
const LIST_OPERATORS = new Set<FilterOperator>(['in', 'notIn']);
const TEXT_OPERATORS_SET = new Set<FilterOperator>([
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
]);

const collators = new Map<string, Intl.Collator>();

function fail(message: string): never {
  throw new DataGridError('SUI-DG-001', message);
}

function collatorFor(locale: string): Intl.Collator {
  const existing = collators.get(locale);
  if (existing) return existing;
  const collator = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: 'base',
  });
  collators.set(locale, collator);
  return collator;
}

function isPrimitive(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function normalizeList(value: unknown): readonly unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail('operator in/notIn membutuhkan array tidak kosong');
  }
  if (value.length > MAX_IN_VALUES) {
    fail(`operator in/notIn maksimum ${MAX_IN_VALUES} nilai`);
  }
  if (!value.every(isPrimitive)) {
    fail('nilai in/notIn harus string, number, atau boolean');
  }
  return [...value];
}

function normalizeBetween(value: unknown): readonly [unknown, unknown] {
  if (!Array.isArray(value) || value.length !== 2) {
    fail('operator between membutuhkan tepat 2 nilai');
  }
  const [first, second] = value as [unknown, unknown];
  const numbers = typeof first === 'number' && typeof second === 'number';
  const strings = typeof first === 'string' && typeof second === 'string';
  if (!numbers && !strings) {
    fail('between membutuhkan dua angka atau dua string tanggal');
  }
  return [first, second];
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') fail('operator teks membutuhkan string');
  const text = value.trim();
  if (text.length === 0) fail('nilai filter teks tidak boleh kosong');
  return text;
}

function normalizeOrdered(value: unknown): number | string {
  if (typeof value === 'number' || typeof value === 'string') return value;
  fail('operator perbandingan membutuhkan angka atau string');
}

function normalizeOperand(operator: FilterOperator, value: unknown): unknown {
  if (NULL_OPERATORS.has(operator)) return undefined;
  if (LIST_OPERATORS.has(operator)) return normalizeList(value);
  if (operator === 'between') return normalizeBetween(value);
  if (TEXT_OPERATORS_SET.has(operator)) return normalizeText(value);
  if (
    operator === 'lt' ||
    operator === 'lte' ||
    operator === 'gt' ||
    operator === 'gte'
  ) {
    return normalizeOrdered(value);
  }
  if (!isPrimitive(value)) {
    fail(`nilai untuk operator ${operator} harus string, number, atau boolean`);
  }
  return value;
}

/** Operator yang aman untuk tipe kolom. */
export function operatorsForType(
  dataType: ColumnDataType,
): readonly FilterOperator[] {
  if (dataType === 'string') return TEXT_OPERATORS;
  if (dataType === 'boolean') return BOOLEAN_OPERATORS;
  return ORDERED_OPERATORS;
}

export function defaultOperatorForType(
  dataType: ColumnDataType,
): FilterOperator {
  return dataType === 'string' ? 'contains' : 'eq';
}

export function isOperatorAllowed(
  dataType: ColumnDataType,
  operator: FilterOperator,
): boolean {
  return operatorsForType(dataType).includes(operator);
}

/** Bangun satu kondisi filter yang tervalidasi. */
export function buildFilterCondition(
  field: string,
  operator: FilterOperator,
  dataType: ColumnDataType,
  value: unknown,
): FilterExpression {
  if (!isOperatorAllowed(dataType, operator)) {
    fail(`operator ${operator} tidak didukung untuk tipe ${dataType}`);
  }
  const operand = normalizeOperand(operator, value);
  return NULL_OPERATORS.has(operator)
    ? [field, operator]
    : [field, operator, operand];
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return typeof value === 'string' && value.trim() === '';
}

/** Gabungkan nilai filter row menjadi satu ekspresi AND (atau null). */
export function buildFilterRow(
  columns: readonly ColumnState[],
  values: FilterRowValues,
): FilterExpression | null {
  const conditions: FilterExpression[] = [];

  for (const column of columns) {
    const entry = values[column.id];
    if (!entry || isEmptyValue(entry.value)) continue;
    const operator = entry.operator ?? defaultOperatorForType(column.dataType);
    conditions.push(
      buildFilterCondition(column.id, operator, column.dataType, entry.value),
    );
  }

  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0] as FilterExpression;
  return ['and', ...conditions];
}

export const MAX_SEARCH_LENGTH = 200;

/** Pencarian teks pada field tertentu, digabung dengan OR. */
export function buildSearchFilter(
  fields: readonly string[],
  text: string,
  maxLength = MAX_SEARCH_LENGTH,
): FilterExpression | null {
  const query = text.trim();
  if (query.length === 0 || fields.length === 0) return null;
  if (query.length > maxLength) {
    fail(`pencarian maksimum ${maxLength} karakter`);
  }

  const conditions = fields.map((field): FilterExpression => [
    field,
    'contains',
    query,
  ]);
  return conditions.length === 1
    ? (conditions[0] as FilterExpression)
    : ['or', ...conditions];
}

/** Validasi AST filter dengan batas core; error menjadi SUI-DG-001. */
export function validateGridFilter(filter: FilterExpression | null): void {
  try {
    validateFilter(filter ?? undefined);
  } catch (error) {
    throw new DataGridError('SUI-DG-001', 'Filter tidak valid.', {
      cause: error,
    });
  }
}

/** Terapkan filter ke baris memakai pipeline core (tanpa duplikasi logika). */
export function applyGridFilter<T extends object>(
  rows: readonly T[],
  filter: FilterExpression | null,
  locale = 'en',
): readonly T[] {
  if (!filter) return rows;
  validateGridFilter(filter);
  return applyFilter(rows, filter, collatorFor(locale));
}
