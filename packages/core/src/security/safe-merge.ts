import { SecurityError } from './errors.js';

/**
 * Deep merge yang aman terhadap prototype pollution
 * (FND-022, docs/05-security.md §5).
 *
 * - Key `__proto__`, `constructor`, dan `prototype` ditolak, bukan diabaikan.
 * - Kedalaman dibatasi agar payload bersarang tidak menghabiskan stack.
 * - Array diganti utuh (bukan digabung per indeks) agar tidak ada elemen liar.
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const DEFAULT_MAX_DEPTH = 20;

export interface SafeMergeOptions {
  /** Kedalaman maksimum; default 20. */
  maxDepth?: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function mergeInto(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  depth: number,
  maxDepth: number,
): void {
  if (depth > maxDepth) {
    throw new SecurityError(
      'SUI-SEC-001',
      `Merge melebihi kedalaman ${maxDepth}.`,
    );
  }

  for (const [key, value] of Object.entries(source)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new SecurityError('SUI-SEC-001', `Key merge ditolak: "${key}".`);
    }

    if (isPlainObject(value)) {
      const existing = target[key];
      const base = isPlainObject(existing) ? existing : Object.create(null);
      const merged: Record<string, unknown> = Object.create(null);
      Object.assign(merged, base);
      mergeInto(merged, value, depth + 1, maxDepth);
      target[key] = merged;
      continue;
    }

    target[key] = Array.isArray(value) ? [...value] : value;
  }
}

/**
 * Gabungkan `patch` ke `base` secara mendalam tanpa memutasi keduanya.
 * Hasil selalu objek biasa (bukan null-prototype) agar aman dipakai consumer.
 */
export function safeMerge<T extends object>(
  base: T,
  patch: Partial<T> | null | undefined,
  options: SafeMergeOptions = {},
): T {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const result: Record<string, unknown> = Object.create(null);

  mergeInto(result, base as Record<string, unknown>, 1, maxDepth);
  if (patch) mergeInto(result, patch as Record<string, unknown>, 1, maxDepth);

  return { ...result } as T;
}

/** Objek tanpa prototype untuk dictionary internal. */
export function nullPrototypeDict<T = unknown>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}
