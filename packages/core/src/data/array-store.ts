import { DataError } from './errors.js';
import { runQuery } from './query.js';
import type {
  Key,
  KeyExpr,
  LoadOptions,
  LoadResult,
  Store,
  StoreCapabilities,
} from './types.js';

/**
 * Store in-memory (FND-018, docs/03-data-layer.md §3.1).
 *
 * Menyimpan salinan dangkal sehingga array consumer tidak pernah dimutasi,
 * menjalankan pipeline lokal, dan mendeteksi key duplikat (SUI-DATA-003).
 */
export interface ArrayStoreOptions<T> {
  key: KeyExpr<T>;
  /** Locale collator untuk perbandingan string; default `en`. */
  locale?: string;
}

const CAPABILITIES: StoreCapabilities = {
  remote: false,
  sort: true,
  filter: true,
  group: false,
  summary: true,
  paging: true,
  crud: true,
};

const COMPOSITE_SEPARATOR = '\u0000';

export class ArrayStore<T extends object> implements Store<T> {
  readonly key: KeyExpr<T>;
  readonly capabilities = CAPABILITIES;

  #rows: T[];
  readonly #collator: Intl.Collator;

  constructor(rows: readonly T[], options: ArrayStoreOptions<T>) {
    this.key = options.key;
    this.#rows = rows.map((row) => ({ ...row }));
    this.#collator = new Intl.Collator(options.locale ?? 'en', {
      numeric: true,
      sensitivity: 'base',
    });
    this.#assertUniqueKeys(this.#rows);
  }

  get size(): number {
    return this.#rows.length;
  }

  async load(options: LoadOptions = {}): Promise<LoadResult<T>> {
    const { data, totalCount } = runQuery(this.#rows, options, this.#collator);
    return { data: data.map((row) => ({ ...row })), totalCount };
  }

  async byKey(key: Key): Promise<T | undefined> {
    const found = this.#rows.find((row) => Object.is(this.#keyOf(row), key));
    return found ? { ...found } : undefined;
  }

  async insert(values: Partial<T>): Promise<T> {
    const row = { ...values } as T;
    const key = this.#keyOf(row);

    if (this.#rows.some((existing) => Object.is(this.#keyOf(existing), key))) {
      throw new DataError('SUI-DATA-003', `Key duplikat: ${String(key)}.`, {
        context: { key: String(key) },
      });
    }

    this.#rows = [...this.#rows, row];
    return { ...row };
  }

  async update(key: Key, values: Partial<T>): Promise<T> {
    const index = this.#indexOf(key);
    const next = { ...this.#rows[index], ...values } as T;
    const nextKey = this.#keyOf(next);

    if (!Object.is(nextKey, key)) {
      this.#assertKeyAvailable(nextKey, key);
    }

    this.#rows = this.#rows.map((row, position) =>
      position === index ? next : row,
    );
    return { ...next };
  }

  async remove(key: Key): Promise<void> {
    const index = this.#indexOf(key);
    this.#rows = this.#rows.filter((_row, position) => position !== index);
  }

  /** Snapshot read-only untuk test atau integrasi. */
  snapshot(): readonly T[] {
    return this.#rows.map((row) => ({ ...row }));
  }

  #indexOf(key: Key): number {
    const index = this.#rows.findIndex((row) =>
      Object.is(this.#keyOf(row), key),
    );
    if (index < 0) {
      throw new DataError('SUI-DATA-001', 'Baris tidak ditemukan.', {
        context: { key: String(key) },
      });
    }
    return index;
  }

  #assertKeyAvailable(candidate: Key, current: Key): void {
    const duplicate = this.#rows.some(
      (row) =>
        !Object.is(this.#keyOf(row), current) &&
        Object.is(this.#keyOf(row), candidate),
    );

    if (duplicate) {
      throw new DataError(
        'SUI-DATA-003',
        `Key duplikat: ${String(candidate)}.`,
        { context: { key: String(candidate) } },
      );
    }
  }

  #assertUniqueKeys(rows: readonly T[]): void {
    const seen = new Set<Key>();

    for (const row of rows) {
      const key = this.#keyOf(row);
      if (seen.has(key)) {
        throw new DataError('SUI-DATA-003', `Key duplikat: ${String(key)}.`, {
          context: { key: String(key) },
        });
      }
      seen.add(key);
    }
  }

  #keyOf(row: T): Key {
    const expression = this.key;

    if (typeof expression === 'function') return expression(row);
    if (Array.isArray(expression)) {
      return (expression as readonly (keyof T)[])
        .map((field) => String(row[field]))
        .join(COMPOSITE_SEPARATOR);
    }
    return row[expression as keyof T] as unknown as Key;
  }
}
