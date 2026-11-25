import type { DataGridStateSnapshot, StateStorage } from '../api/types.js';
import { DataGridError } from '../errors.js';
import type { GridStateStore } from '../model/state.js';

/**
 * Persistensi state DataGrid (DG-022): snapshot versioned, migrasi, autosave
 * debounce, dan penanganan storage korup tanpa merusak grid.
 */

export const CURRENT_SNAPSHOT_VERSION = 1;
export const DEFAULT_MAX_SNAPSHOT_SIZE = 100_000;

export interface StatePersistenceOptions {
  readonly state: GridStateStore;
  readonly storage: StateStorage;
  readonly key: string;
  readonly debounceMs?: number;
  readonly maxSize?: number;
  readonly onError?: (error: DataGridError) => void;
}

export interface StatePersistence {
  save(): void;
  load(): boolean;
  flush(): void;
  clear(): void;
  dispose(): void;
}

type RawSnapshot = Record<string, unknown>;
type Migration = (input: RawSnapshot) => RawSnapshot;

/** v0 (sebelum DG-022) memakai nama field lama. */
const MIGRATIONS: Readonly<Record<number, Migration>> = {
  0: (input) => ({
    version: 1,
    sortBy: input['sort'] ?? [],
    filterValue: input['filter'] ?? null,
    pageIndex: input['page'] ?? 0,
    pageSize: input['pageSize'] ?? 20,
    columnWidths: input['columnWidths'] ?? {},
    columnOrder: input['columnOrder'] ?? [],
    hiddenColumns: input['hiddenColumns'] ?? [],
    groupBy: input['groupBy'] ?? [],
  }),
};

interface PersistContext {
  readonly state: GridStateStore;
  readonly storage: StateStorage;
  readonly key: string;
  readonly maxSize: number;
  readonly report: (error: DataGridError) => void;
}

interface AutoSave {
  readonly cancel: () => void;
  readonly flush: () => void;
  readonly stop: () => void;
}

function persistenceError(message: string, cause?: unknown): DataGridError {
  return new DataGridError('SUI-DG-008', message, cause ? { cause } : {});
}

function isRecord(value: unknown): value is RawSnapshot {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function migrate(raw: RawSnapshot): RawSnapshot {
  let current = raw;
  let version = typeof current['version'] === 'number' ? current['version'] : 0;

  while (version < CURRENT_SNAPSHOT_VERSION) {
    const migrateStep = MIGRATIONS[version];
    if (!migrateStep) {
      throw persistenceError(`Tidak ada migrasi untuk versi ${version}.`);
    }
    current = migrateStep(current);
    version =
      typeof current['version'] === 'number' ? current['version'] : version + 1;
  }

  if (version > CURRENT_SNAPSHOT_VERSION) {
    throw persistenceError(
      `Versi state ${version} lebih baru dari yang didukung (${CURRENT_SNAPSHOT_VERSION}).`,
    );
  }
  return current;
}

function parseSnapshot(raw: string): DataGridStateSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw persistenceError('State tersimpan bukan JSON yang valid.', error);
  }
  if (!isRecord(parsed)) {
    throw persistenceError('State tersimpan harus berupa objek.');
  }
  return migrate(parsed) as unknown as DataGridStateSnapshot;
}

function writeSnapshot(context: PersistContext): void {
  const serialized = JSON.stringify(context.state.toSnapshot());
  if (serialized.length > context.maxSize) {
    context.report(
      persistenceError('State melebihi batas ukuran penyimpanan.'),
    );
    return;
  }
  try {
    context.storage.setItem(context.key, serialized);
  } catch (error) {
    context.report(persistenceError('Gagal menyimpan state.', error));
  }
}

function loadSnapshot(context: PersistContext): boolean {
  let raw: string | null;
  try {
    raw = context.storage.getItem(context.key);
  } catch (error) {
    context.report(persistenceError('Gagal membaca state tersimpan.', error));
    return false;
  }
  if (raw === null) return false;

  try {
    context.state.restore(parseSnapshot(raw));
    return true;
  } catch (error) {
    context.report(
      error instanceof DataGridError && error.code === 'SUI-DG-008'
        ? error
        : persistenceError('State tersimpan tidak valid.', error),
    );
    return false;
  }
}

function createAutoSave(
  state: GridStateStore,
  write: () => void,
  debounceMs: number,
  isDisposed: () => boolean,
): AutoSave {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const unsubscribe = state.subscribe(() => {
    if (isDisposed()) return;
    cancel();
    timer = setTimeout(() => {
      timer = null;
      write();
    }, debounceMs);
    (timer as { unref?: () => void }).unref?.();
  });

  return {
    cancel,
    flush() {
      if (timer === null) return;
      cancel();
      write();
    },
    stop() {
      cancel();
      unsubscribe();
    },
  };
}

export function createStatePersistence(
  options: StatePersistenceOptions,
): StatePersistence {
  let disposed = false;
  const context: PersistContext = {
    state: options.state,
    storage: options.storage,
    key: options.key,
    maxSize: options.maxSize ?? DEFAULT_MAX_SNAPSHOT_SIZE,
    report: (error) => options.onError?.(error),
  };
  const write = (): void => writeSnapshot(context);
  const autoSave = createAutoSave(
    options.state,
    write,
    options.debounceMs ?? 300,
    () => disposed,
  );

  const clear = (): void => {
    autoSave.cancel();
    try {
      options.storage.removeItem(options.key);
    } catch (error) {
      context.report(
        persistenceError('Gagal menghapus state tersimpan.', error),
      );
    }
  };

  return {
    save() {
      autoSave.cancel();
      write();
    },
    load: () => loadSnapshot(context),
    flush: autoSave.flush,
    clear,
    dispose() {
      if (disposed) return;
      disposed = true;
      autoSave.stop();
    },
  };
}
