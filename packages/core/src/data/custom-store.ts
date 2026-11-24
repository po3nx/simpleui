import { DataError, isDataError } from './errors.js';
import type {
  Key,
  KeyExpr,
  LoadOptions,
  LoadResult,
  Store,
  StoreCapabilities,
} from './types.js';

/** Store untuk integrasi API arbitrer (docs/03-data-layer.md §3.2). */
export interface CustomStoreOptions<T> {
  readonly key: KeyExpr<T>;
  readonly load: (options: LoadOptions) => Promise<LoadResult<T>>;
  readonly byKey?: (key: Key, signal?: AbortSignal) => Promise<T | undefined>;
  readonly insert?: (values: Partial<T>) => Promise<T>;
  readonly update?: (key: Key, values: Partial<T>) => Promise<T>;
  readonly remove?: (key: Key) => Promise<void>;
  readonly capabilities?: Partial<StoreCapabilities>;
}

const DEFAULT_CAPABILITIES: StoreCapabilities = {
  remote: true,
  sort: false,
  filter: false,
  group: false,
  summary: false,
  paging: false,
  crud: false,
};

export class CustomStore<T extends object> implements Store<T> {
  readonly key: KeyExpr<T>;
  readonly capabilities: StoreCapabilities;

  readonly #options: CustomStoreOptions<T>;

  constructor(options: CustomStoreOptions<T>) {
    this.#options = options;
    this.key = options.key;
    this.capabilities = { ...DEFAULT_CAPABILITIES, ...options.capabilities };
  }

  async load(options: LoadOptions = {}): Promise<LoadResult<T>> {
    try {
      const result = await this.#options.load(options);
      return validateLoadResult(result);
    } catch (error) {
      throw normalizeStoreError(error, 'load');
    }
  }

  async byKey(key: Key, signal?: AbortSignal): Promise<T | undefined> {
    const callback = this.#options.byKey;
    if (!callback) {
      throw new DataError('SUI-DATA-008', 'Store tidak mendukung byKey.');
    }

    try {
      return await callback(key, signal);
    } catch (error) {
      throw normalizeStoreError(error, 'byKey');
    }
  }

  async insert(values: Partial<T>): Promise<T> {
    const callback = this.#options.insert;
    if (!callback) {
      throw new DataError('SUI-DATA-008', 'Store tidak mendukung insert.');
    }

    try {
      return await callback(values);
    } catch (error) {
      throw normalizeStoreError(error, 'insert');
    }
  }

  async update(key: Key, values: Partial<T>): Promise<T> {
    const callback = this.#options.update;
    if (!callback) {
      throw new DataError('SUI-DATA-008', 'Store tidak mendukung update.');
    }

    try {
      return await callback(key, values);
    } catch (error) {
      throw normalizeStoreError(error, 'update');
    }
  }

  async remove(key: Key): Promise<void> {
    const callback = this.#options.remove;
    if (!callback) {
      throw new DataError('SUI-DATA-008', 'Store tidak mendukung remove.');
    }

    try {
      await callback(key);
    } catch (error) {
      throw normalizeStoreError(error, 'remove');
    }
  }
}

/** Validasi bentuk respons; store yang salah bentuk gagal cepat (SUI-DATA-002). */
function validateLoadResult<T>(result: LoadResult<T>): LoadResult<T> {
  if (
    typeof result !== 'object' ||
    result === null ||
    !Array.isArray(result.data)
  ) {
    throw new DataError(
      'SUI-DATA-002',
      'Store harus mengembalikan { data: T[] }.',
    );
  }

  if (
    result.totalCount !== undefined &&
    (typeof result.totalCount !== 'number' || result.totalCount < 0)
  ) {
    throw new DataError('SUI-DATA-002', 'totalCount harus angka >= 0.');
  }

  return result;
}

function normalizeStoreError(error: unknown, operation: string): DataError {
  if (isDataError(error)) return error;

  const aborted =
    (error as { name?: string } | null)?.name === 'AbortError' ||
    (error as { code?: unknown } | null)?.code === 'ABORT_ERR';

  if (aborted) {
    return new DataError('SUI-DATA-005', 'Permintaan dibatalkan.', {
      cause: error,
    });
  }

  return new DataError('SUI-DATA-002', `Operasi store gagal: ${operation}.`, {
    cause: error,
    retryable: true,
  });
}
