import { describe, expect, it, vi } from 'vitest';
import {
  createLocalStorageAdapter,
  createMemoryStorage,
  createSessionStorageAdapter,
} from './persistence-storage.js';

describe('createMemoryStorage', () => {
  it('menyimpan, membaca, dan menghapus nilai', () => {
    const storage = createMemoryStorage();
    expect(storage.getItem('a')).toBeNull();
    storage.setItem('a', '1');
    expect(storage.getItem('a')).toBe('1');
    storage.removeItem('a');
    expect(storage.getItem('a')).toBeNull();
  });
});

describe('adapter web storage', () => {
  it('memakai memory saat localStorage tidak tersedia', () => {
    const storage = createLocalStorageAdapter();
    storage.setItem('x', '2');
    expect(storage.getItem('x')).toBe('2');
    storage.removeItem('x');
    expect(storage.getItem('x')).toBeNull();
    expect(createSessionStorageAdapter().getItem('x')).toBeNull();
  });

  it('tidak melempar saat setItem native gagal (quota/private mode)', () => {
    const throwing = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error('QuotaExceeded');
      }),
      removeItem: vi.fn(),
    } as unknown as Storage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: throwing,
    });

    const storage = createLocalStorageAdapter();
    expect(() => storage.setItem('k', 'v')).not.toThrow();
    expect(storage.getItem('k')).toBe('v');

    delete (globalThis as { localStorage?: Storage }).localStorage;
  });
});
