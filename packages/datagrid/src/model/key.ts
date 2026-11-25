import type { Key, KeyExpr } from '@simpleui/core';

import { DataGridError } from '../errors.js';

/**
 * Identitas key DataGrid (DG-019): resolver tunggal/composite/fungsi,
 * validasi unik, dan encoding stabil untuk DOM id.
 */

export interface KeyResolver<T extends object> {
  readonly keyExpr: KeyExpr<T>;
  readonly composite: boolean;
  keyOf(row: T): Key;
  equals(first: Key, second: Key): boolean;
}

function fail(
  code: 'SUI-DG-001' | 'SUI-DG-002' | 'SUI-DG-003',
  message: string,
  path?: string,
): never {
  throw new DataGridError(code, message, path === undefined ? {} : { path });
}

function assertKeyValue(
  value: unknown,
  field: string,
  index: number,
): asserts value is Key {
  if (value === undefined || value === null) {
    fail(
      'SUI-DG-003',
      `key hilang pada baris ${index} (field "${field}").`,
      'keyExpr',
    );
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    fail(
      'SUI-DG-003',
      `key pada baris ${index} harus string atau number (field "${field}").`,
      'keyExpr',
    );
  }
}

function extractKey<T extends object>(
  keyExpr: KeyExpr<T>,
  row: T,
  index: number,
): Key {
  if (typeof keyExpr === 'function') {
    const value = keyExpr(row);
    if (value === undefined || value === null) {
      fail('SUI-DG-003', `key hilang pada baris ${index}.`, 'keyExpr');
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
      fail('SUI-DG-003', `key pada baris ${index} harus string atau number.`);
    }
    return value;
  }

  if (Array.isArray(keyExpr)) {
    return keyExpr
      .map((field) => {
        const value = (row as Record<PropertyKey, unknown>)[
          field as PropertyKey
        ];
        assertKeyValue(value, String(field), index);
        return String(value);
      })
      .join('\u0000');
  }

  const value = (row as Record<PropertyKey, unknown>)[keyExpr as PropertyKey];
  assertKeyValue(value, String(keyExpr), index);
  return value;
}

export function createKeyResolver<T extends object>(
  keyExpr: KeyExpr<T> | undefined,
): KeyResolver<T> {
  if (keyExpr === undefined) {
    fail('SUI-DG-003', 'keyExpr wajib untuk identitas baris.', 'keyExpr');
  }

  const composite = Array.isArray(keyExpr);

  return {
    keyExpr,
    composite,
    keyOf: (row) => extractKey(keyExpr, row, 0),
    equals: (first, second) => Object.is(first, second),
  };
}

/** Encoding stabil: membedakan number 1 dan string "1". */
export function encodeKey(key: Key): string {
  return typeof key === 'number' ? `n:${key}` : `s:${encodeURIComponent(key)}`;
}

/** DOM id aman untuk baris (dipakai aria-activedescendant). */
export function keyToDomId(key: Key, prefix = 'sui-row'): string {
  return `${prefix}-${encodeKey(key)}`;
}

/** Bangun indeks baris berdasarkan key; duplikat → SUI-DG-002. */
export function buildKeyIndex<T extends object>(
  rows: readonly T[],
  resolver: KeyResolver<T>,
): Map<string, T> {
  const index = new Map<string, T>();

  rows.forEach((row, rowIndex) => {
    const key = extractKey(resolver.keyExpr, row, rowIndex);
    const encoded = encodeKey(key);
    if (index.has(encoded)) {
      fail(
        'SUI-DG-002',
        `key duplikat pada baris ${rowIndex}: ${String(key)}.`,
        'keyExpr',
      );
    }
    index.set(encoded, row);
  });

  return index;
}

/** Validasi seluruh baris memiliki key unik dan tidak hilang. */
export function assertUniqueKeys<T extends object>(
  rows: readonly T[],
  resolver: KeyResolver<T>,
): void {
  buildKeyIndex(rows, resolver);
}
