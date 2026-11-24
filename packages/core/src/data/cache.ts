import { DataError } from './errors.js';
import type {
  Key,
  LoadOptions,
  LoadResult,
  Store,
  StoreCapabilities,
} from './types.js';

/** Cache LRU + TTL + dedupe untuk store apa pun (docs/03-data-layer.md §6). */
export interface CachedStoreOptions {
  /** Batas entri LRU; default 20. */
  maxEntries?: number;
  /** Umur entri; default 5 menit. */
  ttlMs?: number;
  /** Sumber waktu; dapat di-inject untuk test. */
  now?: () => number;
  /** Tandai hasil sebagai sensitif. */
  sensitiveData?: boolean;
  /** Harus opt-in untuk meng-cache data sensitif; default false. */
  cacheSensitiveData?: boolean;
}

interface Entry<T> {
  result: LoadResult<T>;
  expiresAt: number;
}

const DEFAULT_MAX_ENTRIES = 20;
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** Kunci deterministik dari opsi yang memengaruhi hasil (signal diabaikan). */
export function cacheKeyFor(options: LoadOptions): string {
  return JSON.stringify({
    skip: options.skip ?? 0,
    take: options.take ?? null,
    sort: options.sort ?? [],
    filter: options.filter ?? null,
    group: options.group ?? [],
  });
}

export class CachedStore<T extends object> implements Store<T> {
  readonly key: KeyExprOf<T>;
  readonly capabilities: StoreCapabilities;

  readonly #inner: Store<T>;
  readonly #cache = new Map<string, Entry<T>>();
  readonly #inflight = new Map<string, Promise<LoadResult<T>>>();
  readonly #maxEntries: number;
  readonly #ttlMs: number;
  readonly #now: () => number;
  readonly #sensitive: boolean;
  readonly #cacheSensitive: boolean;

  constructor(inner: Store<T>, options: CachedStoreOptions = {}) {
    this.#inner = inner;
    this.key = inner.key;
    this.capabilities = inner.capabilities;
    this.#maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.#ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.#now = options.now ?? (() => Date.now());
    this.#sensitive = options.sensitiveData ?? false;
    this.#cacheSensitive = options.cacheSensitiveData ?? false;
  }

  get size(): number {
    return this.#cache.size;
  }

  load(options: LoadOptions = {}): Promise<LoadResult<T>> {
    if (this.#sensitive && !this.#cacheSensitive) {
      return this.#inner.load(options);
    }

    const key = cacheKeyFor(options);
    const cached = this.#cache.get(key);

    if (cached && cached.expiresAt > this.#now()) {
      // Sentuh agar menjadi entri terbaru (LRU).
      this.#cache.delete(key);
      this.#cache.set(key, cached);
      return Promise.resolve(cached.result);
    }
    if (cached) this.#cache.delete(key);

    const pending = this.#inflight.get(key);
    if (pending) return pending;

    const request = this.#inner.load(options).then(
      (result) => {
        this.#remember(key, result);
        this.#inflight.delete(key);
        return result;
      },
      (error: unknown) => {
        this.#inflight.delete(key);
        throw error;
      },
    );

    this.#inflight.set(key, request);
    return request;
  }

  async byKey(key: Key, signal?: AbortSignal): Promise<T | undefined> {
    return this.#inner.byKey(key, signal);
  }

  async insert(values: Partial<T>): Promise<T> {
    this.#requireCrud('insert');
    const row = await this.#inner.insert?.(values);
    this.clear();
    return row as T;
  }

  async update(key: Key, values: Partial<T>): Promise<T> {
    this.#requireCrud('update');
    const row = await this.#inner.update?.(key, values);
    this.clear();
    return row as T;
  }

  async remove(key: Key): Promise<void> {
    this.#requireCrud('remove');
    await this.#inner.remove?.(key);
    this.clear();
  }

  /** Kosongkan cache; dedupe yang sedang berjalan dibiarkan selesai. */
  clear(): void {
    this.#cache.clear();
  }

  #remember(key: string, result: LoadResult<T>): void {
    this.#cache.delete(key);
    this.#cache.set(key, { result, expiresAt: this.#now() + this.#ttlMs });

    while (this.#cache.size > this.#maxEntries) {
      const oldest = this.#cache.keys().next().value;
      if (oldest === undefined) break;
      this.#cache.delete(oldest);
    }
  }

  #requireCrud(operation: string): void {
    if (!this.#inner.capabilities.crud) {
      throw new DataError(
        'SUI-DATA-008',
        `Store tidak mendukung ${operation}.`,
      );
    }
  }
}

type KeyExprOf<T> = Store<T>['key'];
