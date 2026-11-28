import type { DataStore } from '@simpleui/core';

/**
 * Lookup resolver DataGrid (DG-065): label cache dari store, batch load nilai,
 * dan remote search untuk editor select/combobox.
 */

export interface LookupOptions {
  readonly store: DataStore<Record<string, unknown>>;
  readonly valueExpr: string;
  readonly textExpr: string;
  readonly searchEnabled?: boolean;
  readonly debounceMs?: number;
  readonly minSearchLength?: number;
  readonly pageSize?: number;
}

export interface LookupItem {
  readonly value: unknown;
  readonly text: string;
}

export interface LookupResolver {
  getLabel(value: unknown): string | undefined;
  ensure(values: readonly unknown[]): Promise<void>;
  search(query: string, signal?: AbortSignal): Promise<readonly LookupItem[]>;
  clear(): void;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_IN_VALUES = 1000;

function keyOf(value: unknown): string {
  return String(value);
}

function textOf(item: Record<string, unknown>, field: string): string {
  const value = item[field];
  return value === null || value === undefined ? '' : String(value);
}

class LookupResolverImpl implements LookupResolver {
  readonly #options: LookupOptions;
  readonly #labels = new Map<string, string>();
  readonly #missing = new Set<string>();

  constructor(options: LookupOptions) {
    this.#options = options;
  }

  getLabel(value: unknown): string | undefined {
    return this.#labels.get(keyOf(value));
  }

  async ensure(values: readonly unknown[]): Promise<void> {
    const missing = new Map<string, unknown>();
    for (const value of values) {
      const key = keyOf(value);
      if (!this.#labels.has(key) && !this.#missing.has(key)) {
        missing.set(key, value);
      }
    }
    const entries = [...missing].slice(0, MAX_IN_VALUES);
    if (entries.length === 0) return;
    entries.forEach(([key]) => this.#missing.add(key));
    try {
      const result = await this.#options.store.load({
        filter: [
          this.#options.valueExpr,
          'in',
          entries.map(([, value]) => value),
        ] as never,
        take: entries.length,
      });
      for (const item of result.data) {
        this.#labels.set(
          keyOf(item[this.#options.valueExpr]),
          textOf(item, this.#options.textExpr),
        );
      }
    } catch {
      // Label gagal dimuat: sel tetap menampilkan nilai mentah.
    }
  }

  async search(
    query: string,
    signal?: AbortSignal,
  ): Promise<readonly LookupItem[]> {
    const trimmed = query.trim();
    if (
      trimmed.length < (this.#options.minSearchLength ?? 0) ||
      (this.#options.searchEnabled === false && trimmed.length > 0)
    ) {
      return [];
    }
    try {
      const result = await this.#options.store.load({
        ...(trimmed
          ? {
              filter: [this.#options.textExpr, 'contains', trimmed] as never,
            }
          : {}),
        take: this.#options.pageSize ?? DEFAULT_PAGE_SIZE,
        ...(signal ? { signal } : {}),
      });
      return result.data.map((item) => ({
        value: item[this.#options.valueExpr],
        text: textOf(item, this.#options.textExpr),
      }));
    } catch {
      return [];
    }
  }

  clear(): void {
    this.#labels.clear();
    this.#missing.clear();
  }
}

export function createLookupResolver(options: LookupOptions): LookupResolver {
  return new LookupResolverImpl(options);
}
