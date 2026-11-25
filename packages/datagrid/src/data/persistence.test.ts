import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StateStorage } from '../api/types.js';
import type { DataGridError } from '../errors.js';
import { createGridStateStore } from '../model/state.js';
import {
  createStatePersistence,
  CURRENT_SNAPSHOT_VERSION,
} from './persistence.js';

class MemoryStorage implements StateStorage {
  readonly data = new Map<string, string>();
  failWrite = false;

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrite) throw new Error('penuh');
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

afterEach(() => {
  vi.useRealTimers();
});

function setup(debounceMs = 50) {
  const state = createGridStateStore();
  const storage = new MemoryStorage();
  const onError = vi.fn();
  const persistence = createStatePersistence({
    state,
    storage,
    key: 'grid',
    debounceMs,
    onError,
  });
  return { state, storage, onError, persistence };
}

describe('state persistence — save dan load', () => {
  it('menyimpan snapshot dengan versi', () => {
    const { state, storage, persistence } = setup();
    state.setSorting([{ selector: 'name', desc: true }]);
    state.setPageSize(50);
    state.setPage(2);

    persistence.save();

    const raw = storage.getItem('grid');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as Record<string, unknown>;
    expect(parsed['version']).toBe(CURRENT_SNAPSHOT_VERSION);
    expect(parsed['sortBy']).toEqual([{ selector: 'name', desc: true }]);
    expect(parsed['pageSize']).toBe(50);
    expect(parsed['pageIndex']).toBe(2);
    expect(parsed['selection']).toBeUndefined();
  });

  it('memulihkan state ke store baru', () => {
    const source = setup().state;
    source.setSorting([{ selector: 'id', desc: false }]);
    source.setFilter(['active', 'eq', true]);
    source.setColumnWidth('name', 200);

    const target = createGridStateStore();
    const storage = new MemoryStorage();
    const write = createStatePersistence({
      state: source,
      storage,
      key: 'grid',
    });
    write.save();

    const read = createStatePersistence({
      state: target,
      storage,
      key: 'grid',
    });
    expect(read.load()).toBe(true);
    expect(target.getState().sorting).toEqual([
      { selector: 'id', desc: false },
    ]);
    expect(target.getState().filterValue).toEqual(['active', 'eq', true]);
    expect(target.getState().columnWidths).toEqual({ name: 200 });
  });

  it('mengembalikan false bila belum ada state', () => {
    const { persistence } = setup();
    expect(persistence.load()).toBe(false);
  });

  it('migrasi snapshot versi 0', () => {
    const { state, storage, persistence } = setup();
    storage.setItem(
      'grid',
      JSON.stringify({
        version: 0,
        sort: [{ selector: 'name', desc: true }],
        filter: ['active', 'eq', true],
        page: 1,
        pageSize: 10,
      }),
    );

    expect(persistence.load()).toBe(true);
    expect(state.getState()).toMatchObject({
      sorting: [{ selector: 'name', desc: true }],
      filterValue: ['active', 'eq', true],
      pageIndex: 1,
      pageSize: 10,
    });
  });
});

describe('state persistence — state korup', () => {
  it('menolak JSON korup dan melapor SUI-DG-008', () => {
    const { state, storage, onError, persistence } = setup();
    state.setPageSize(20);
    storage.setItem('grid', '{bukan json');

    expect(persistence.load()).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]?.[0] as DataGridError).code).toBe(
      'SUI-DG-008',
    );
    expect(state.getState().pageSize).toBe(20);
  });

  it('menolak versi lebih baru', () => {
    const { storage, onError, persistence } = setup();
    storage.setItem('grid', JSON.stringify({ version: 99 }));

    expect(persistence.load()).toBe(false);
    expect((onError.mock.calls[0]?.[0] as DataGridError).code).toBe(
      'SUI-DG-008',
    );
  });

  it('membungkus nilai tidak valid sebagai SUI-DG-008', () => {
    const { storage, onError, persistence } = setup();
    storage.setItem('grid', JSON.stringify({ version: 1, pageSize: 0 }));

    expect(persistence.load()).toBe(false);
    expect((onError.mock.calls[0]?.[0] as DataGridError).code).toBe(
      'SUI-DG-008',
    );
  });
});

describe('state persistence — autosave', () => {
  it('menggabungkan perubahan dalam satu penulisan (debounce)', () => {
    vi.useFakeTimers();
    const { state, storage, persistence } = setup(100);
    const setItem = vi.spyOn(storage, 'setItem');

    state.setPage(1);
    state.setPage(2);
    state.setPageSize(50);
    expect(setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(setItem).toHaveBeenCalledTimes(1);
    persistence.dispose();
  });

  it('flush menulis segera dan membatalkan timer', () => {
    vi.useFakeTimers();
    const { state, storage, persistence } = setup(100);
    state.setPage(1);

    persistence.flush();
    expect(storage.getItem('grid')).not.toBeNull();

    vi.advanceTimersByTime(200);
    persistence.dispose();
  });

  it('dispose membatalkan penulisan tertunda', () => {
    vi.useFakeTimers();
    const { state, storage, persistence } = setup(100);
    const setItem = vi.spyOn(storage, 'setItem');

    state.setPage(1);
    persistence.dispose();
    vi.advanceTimersByTime(200);

    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('state persistence — batas dan kegagalan storage', () => {
  it('menolak snapshot melebihi batas ukuran', () => {
    const state = createGridStateStore();
    const storage = new MemoryStorage();
    const onError = vi.fn();
    const persistence = createStatePersistence({
      state,
      storage,
      key: 'grid',
      maxSize: 10,
      onError,
    });

    persistence.save();

    expect(storage.getItem('grid')).toBeNull();
    expect((onError.mock.calls[0]?.[0] as DataGridError).code).toBe(
      'SUI-DG-008',
    );
  });

  it('melaporkan kegagalan menulis tanpa melempar', () => {
    const { storage, onError, persistence } = setup();
    storage.failWrite = true;

    expect(() => persistence.save()).not.toThrow();
    expect((onError.mock.calls[0]?.[0] as DataGridError).code).toBe(
      'SUI-DG-008',
    );
  });

  it('clear menghapus state tersimpan', () => {
    const { storage, persistence } = setup();
    persistence.save();
    persistence.clear();
    expect(storage.getItem('grid')).toBeNull();
  });
});
