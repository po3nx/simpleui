import type { StateStorage } from '../api/types.js';

/**
 * Storage adapter untuk state persistence (DG-075): memory, localStorage,
 * sessionStorage dengan fallback aman saat storage tidak tersedia (SSR,
 * private mode, quota penuh).
 */

export function createMemoryStorage(): StateStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

type WebStorageKind = 'local' | 'session';

function nativeStorage(kind: WebStorageKind): Storage | undefined {
  try {
    const storage =
      kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    return storage ?? undefined;
  } catch {
    return undefined;
  }
}

function createFallbackStorage(kind: WebStorageKind): StateStorage {
  const memory = createMemoryStorage();
  const storage = nativeStorage(kind);

  const read = (key: string): string | null => {
    if (!storage) return memory.getItem(key);
    try {
      return storage.getItem(key) ?? memory.getItem(key);
    } catch {
      return memory.getItem(key);
    }
  };
  const write = (key: string, value: string): void => {
    memory.setItem(key, value);
    if (!storage) return;
    try {
      storage.setItem(key, value);
    } catch {
      // Quota/private mode: nilai tetap tersedia di memory untuk sesi ini.
    }
  };
  const remove = (key: string): void => {
    memory.removeItem(key);
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch {
      // Abaikan; memory sudah dibersihkan.
    }
  };

  return { getItem: read, setItem: write, removeItem: remove };
}

export function createLocalStorageAdapter(): StateStorage {
  return createFallbackStorage('local');
}

export function createSessionStorageAdapter(): StateStorage {
  return createFallbackStorage('session');
}
