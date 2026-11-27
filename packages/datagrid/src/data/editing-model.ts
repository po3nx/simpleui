import type { DataStore, Key, KeyExpr } from '@simpleui/core';

import type {
  EditingCanceledEvent,
  EditingMode,
  EditingStartEvent,
  RowUpdatedEvent,
  RowUpdatingEvent,
  SaveFailedEvent,
} from '../api/types.js';

/**
 * Model editing DataGrid (DG-060): draft per baris, transaksi batch, strategi
 * optimistic/pessimistic, rollback lokal, dan event cancelable.
 *
 * UI editor (DG-061) memakai model ini; model tidak menyentuh DOM.
 */

export type EditSaveStrategy = 'optimistic' | 'pessimistic';

export interface EditingModelOptions<T extends object> {
  readonly store: DataStore<T>;
  readonly keyExpr: KeyExpr<T>;
  readonly rows: readonly T[];
  readonly mode?: EditingMode;
  readonly strategy?: EditSaveStrategy;
  readonly allowUpdating?: boolean;
  readonly allowAdding?: boolean;
  readonly allowDeleting?: boolean;
  readonly onChange?: (rows: readonly T[]) => void;
  readonly onEditingStart?: (event: EditingStartEvent<T>) => void;
  readonly onEditingCanceled?: (event: EditingCanceledEvent) => void;
  readonly onRowUpdating?: (event: RowUpdatingEvent<T>) => void;
  readonly onRowUpdated?: (event: RowUpdatedEvent<T>) => void;
  readonly onSaveFailed?: (event: SaveFailedEvent) => void;
}

export interface EditingModel<T extends object> {
  readonly mode: EditingMode;
  readonly strategy: EditSaveStrategy;
  beginEdit(key: Key, columnId?: string | null): boolean;
  update(values: Partial<T>): void;
  cancel(): void;
  save(): Promise<boolean>;
  add(values: Partial<T>): Promise<T | undefined>;
  remove(key: Key): Promise<boolean>;
  getRows(): readonly T[];
  getEditingKey(): Key | null;
  getDraft(): Readonly<Partial<T>> | null;
  getPending(): ReadonlyMap<Key, Partial<T>>;
  isDirty(): boolean;
  dispose(): void;
}

interface EditEntry<T extends object> {
  readonly key: Key;
  readonly values: Partial<T>;
}

function resolveKey<T extends object>(keyExpr: KeyExpr<T>): (row: T) => Key {
  if (typeof keyExpr === 'function') return keyExpr;
  if (Array.isArray(keyExpr)) {
    return (row) =>
      keyExpr
        .map((field) => String((row as Record<PropertyKey, unknown>)[field]))
        .join('\u0000');
  }
  return (row) =>
    (row as Record<PropertyKey, unknown>)[keyExpr as PropertyKey] as Key;
}

function replaceRow<T extends object>(
  rows: readonly T[],
  keyOf: (row: T) => Key,
  key: Key,
  next: T,
): readonly T[] {
  return rows.map((row) => (Object.is(keyOf(row), key) ? next : row));
}

class EditingModelImpl<T extends object> implements EditingModel<T> {
  readonly mode: EditingMode;
  readonly strategy: EditSaveStrategy;
  readonly #options: EditingModelOptions<T>;
  readonly #keyOf: (row: T) => Key;
  #rows: readonly T[];
  #editingKey: Key | null = null;
  #draft: Partial<T> | null = null;
  readonly #pending = new Map<Key, Partial<T>>();
  #disposed = false;

  constructor(options: EditingModelOptions<T>) {
    this.#options = options;
    this.#keyOf = resolveKey(options.keyExpr);
    this.#rows = options.rows;
    this.mode = options.mode ?? 'none';
    this.strategy = options.strategy ?? 'pessimistic';
  }

  beginEdit(key: Key, columnId: string | null = null): boolean {
    if (this.#disposed || this.mode === 'none') return false;
    if (this.#options.allowUpdating === false) return false;
    const row = this.#rows.find((entry) => Object.is(this.#keyOf(entry), key));
    if (!row) return false;

    const event: EditingStartEvent<T> = {
      rowKey: key,
      columnId,
      data: row,
    };
    this.#options.onEditingStart?.(event);
    if (event.cancel === true) return false;

    this.#editingKey = key;
    this.#draft = { ...row };
    return true;
  }

  update(values: Partial<T>): void {
    if (this.#disposed || this.#editingKey === null || this.#draft === null) {
      return;
    }
    this.#draft = { ...this.#draft, ...values };
    const existing = this.#pending.get(this.#editingKey) ?? {};
    this.#pending.set(this.#editingKey, { ...existing, ...values });
  }

  cancel(): void {
    if (this.#editingKey === null) return;
    const key = this.#editingKey;
    this.#editingKey = null;
    this.#draft = null;
    this.#pending.delete(key);
    this.#options.onEditingCanceled?.({ rowKey: key });
  }

  getRows(): readonly T[] {
    return this.#rows;
  }

  getEditingKey(): Key | null {
    return this.#editingKey;
  }

  getDraft(): Readonly<Partial<T>> | null {
    return this.#draft;
  }

  getPending(): ReadonlyMap<Key, Partial<T>> {
    return this.#pending;
  }

  isDirty(): boolean {
    return this.#pending.size > 0;
  }

  #confirmEntries(entries: readonly EditEntry<T>[]): boolean {
    for (const entry of entries) {
      const event: RowUpdatingEvent<T> = {
        key: entry.key,
        values: entry.values,
      };
      this.#options.onRowUpdating?.(event);
      if (event.cancel === true) {
        this.#options.onEditingCanceled?.({ rowKey: entry.key });
        return false;
      }
    }
    return true;
  }

  async #storeEntries(
    entries: readonly EditEntry<T>[],
    snapshot: readonly T[],
  ): Promise<boolean> {
    try {
      for (const entry of entries) {
        const updated = await this.#options.store.update?.(
          entry.key,
          entry.values,
        );
        if (!updated) {
          throw new Error(
            `Store tidak mengembalikan baris ${String(entry.key)}.`,
          );
        }
        if (this.strategy === 'pessimistic') {
          this.#rows = replaceRow(this.#rows, this.#keyOf, entry.key, updated);
        }
        this.#options.onRowUpdated?.({ key: entry.key, data: updated });
      }
      return true;
    } catch (error) {
      this.#rows = snapshot;
      this.#options.onChange?.(this.#rows);
      this.#options.onSaveFailed?.({ error });
      return false;
    }
  }

  async save(): Promise<boolean> {
    if (this.#disposed || this.#pending.size === 0) return false;
    const entries: EditEntry<T>[] = [...this.#pending].map(([key, values]) => ({
      key,
      values,
    }));
    if (!this.#confirmEntries(entries)) return false;

    const snapshot = this.#rows;
    if (this.strategy === 'optimistic') this.#applyLocal(entries);
    if (!(await this.#storeEntries(entries, snapshot))) return false;

    this.#rows = this.#rows.map((row) => ({
      ...row,
      ...this.#pending.get(this.#keyOf(row)),
    }));
    this.#pending.clear();
    this.#editingKey = null;
    this.#draft = null;
    this.#options.onChange?.(this.#rows);
    return true;
  }

  async add(values: Partial<T>): Promise<T | undefined> {
    if (
      this.#disposed ||
      this.#options.allowAdding !== true ||
      !this.#options.store.insert
    ) {
      return undefined;
    }
    try {
      const inserted = await this.#options.store.insert(values);
      this.#rows = [...this.#rows, inserted];
      this.#options.onChange?.(this.#rows);
      return inserted;
    } catch (error) {
      this.#options.onSaveFailed?.({ error });
      return undefined;
    }
  }

  async remove(key: Key): Promise<boolean> {
    if (
      this.#disposed ||
      this.#options.allowDeleting !== true ||
      !this.#options.store.remove
    ) {
      return false;
    }
    const snapshot = this.#rows;
    const optimistic = this.strategy === 'optimistic';
    if (optimistic) {
      this.#rows = this.#rows.filter(
        (row) => !Object.is(this.#keyOf(row), key),
      );
      this.#options.onChange?.(this.#rows);
    }
    try {
      await this.#options.store.remove(key);
      if (!optimistic) {
        this.#rows = this.#rows.filter(
          (row) => !Object.is(this.#keyOf(row), key),
        );
        this.#options.onChange?.(this.#rows);
      }
      this.#pending.delete(key);
      return true;
    } catch (error) {
      this.#rows = snapshot;
      this.#options.onChange?.(this.#rows);
      this.#options.onSaveFailed?.({ error });
      return false;
    }
  }

  #applyLocal(entries: readonly EditEntry<T>[]): void {
    for (const entry of entries) {
      this.#rows = this.#rows.map((row) =>
        Object.is(this.#keyOf(row), entry.key)
          ? { ...row, ...entry.values }
          : row,
      );
    }
    this.#options.onChange?.(this.#rows);
  }

  dispose(): void {
    this.#disposed = true;
    this.#pending.clear();
    this.#editingKey = null;
    this.#draft = null;
  }
}

export function createEditingModel<T extends object>(
  options: EditingModelOptions<T>,
): EditingModel<T> {
  return new EditingModelImpl(options);
}
