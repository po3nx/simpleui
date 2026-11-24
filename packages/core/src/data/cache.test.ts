import { describe, expect, it, vi } from 'vitest';
import { cacheKeyFor, CachedStore } from './cache.js';
import type { Store } from './types.js';

interface Row {
  id: number;
  name: string;
}

function createInner(overrides: Partial<Store<Row>> = {}) {
  const calls = { load: 0 };
  const store: Store<Row> = {
    key: 'id',
    capabilities: {
      remote: true,
      sort: true,
      filter: true,
      group: false,
      summary: false,
      paging: true,
      crud: true,
    },
    load: async () => {
      calls.load += 1;
      return { data: [{ id: calls.load, name: 'A' }], totalCount: 1 };
    },
    byKey: async () => undefined,
    insert: async (values) => ({ id: 1, name: 'A', ...values }),
    update: async (key, values) => ({ id: Number(key), name: 'A', ...values }),
    remove: async () => {},
    ...overrides,
  };

  return { store, calls };
}

describe('cacheKeyFor', () => {
  it('menghasilkan kunci sama untuk opsi setara dan berbeda untuk opsi lain', () => {
    expect(cacheKeyFor({ take: 10 })).toBe(cacheKeyFor({ take: 10, skip: 0 }));
    expect(cacheKeyFor({ take: 10 })).not.toBe(cacheKeyFor({ take: 20 }));
  });
});

describe('CachedStore', () => {
  it('mengembalikan hasil cache untuk permintaan identik', async () => {
    const { store, calls } = createInner();
    const cached = new CachedStore(store);

    await cached.load({ take: 10 });
    await cached.load({ take: 10 });

    expect(calls.load).toBe(1);
    expect(cached.size).toBe(1);
  });

  it('memisahkan entri untuk opsi berbeda', async () => {
    const { store, calls } = createInner();
    const cached = new CachedStore(store);

    await cached.load({ take: 10 });
    await cached.load({ take: 20 });

    expect(calls.load).toBe(2);
  });

  it('menghormati TTL', async () => {
    let now = 0;
    const { store, calls } = createInner();
    const cached = new CachedStore(store, { ttlMs: 100, now: () => now });

    await cached.load();
    now = 50;
    await cached.load();
    expect(calls.load).toBe(1);

    now = 101;
    await cached.load();
    expect(calls.load).toBe(2);
  });

  it('membatasi jumlah entri dengan LRU', async () => {
    const { store, calls } = createInner();
    const cached = new CachedStore(store, { maxEntries: 1 });

    await cached.load({ take: 1 });
    await cached.load({ take: 2 });
    await cached.load({ take: 1 });

    expect(calls.load).toBe(3);
    expect(cached.size).toBe(1);
  });

  it('menggabungkan permintaan identik yang berjalan bersamaan', async () => {
    let resolveLoad: ((value: { data: Row[] }) => void) | undefined;
    const { store, calls } = createInner({
      load: () =>
        new Promise((resolve) => {
          calls.load += 1;
          resolveLoad = resolve;
        }),
    });
    const cached = new CachedStore(store);

    const first = cached.load({ take: 5 });
    const second = cached.load({ take: 5 });
    resolveLoad?.({ data: [] });

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(calls.load).toBe(1);
  });

  it('melewati cache untuk data sensitif kecuali diizinkan', async () => {
    const first = createInner();
    const guarded = new CachedStore(first.store, { sensitiveData: true });
    await guarded.load();
    await guarded.load();
    expect(first.calls.load).toBe(2);

    const second = createInner();
    const allowed = new CachedStore(second.store, {
      sensitiveData: true,
      cacheSensitiveData: true,
    });
    await allowed.load();
    await allowed.load();
    expect(second.calls.load).toBe(1);
  });

  it('menginvalidasi cache setelah mutasi', async () => {
    const { store, calls } = createInner();
    const cached = new CachedStore(store);

    await cached.load();
    await cached.insert({ name: 'B' });
    await cached.load();

    expect(calls.load).toBe(2);
  });

  it('menolak mutasi bila store tidak mendukung CRUD', async () => {
    const { store } = createInner({
      capabilities: {
        remote: true,
        sort: false,
        filter: false,
        group: false,
        summary: false,
        paging: false,
        crud: false,
      },
    });
    const cached = new CachedStore(store);

    await expect(cached.insert({ name: 'x' })).rejects.toThrowError(
      /SUI-DATA-008/,
    );
  });

  it('mendelegasikan byKey dan mengekspos capabilities', async () => {
    const byKey = vi.fn(async () => ({ id: 1, name: 'A' }));
    const { store } = createInner({ byKey });
    const cached = new CachedStore(store);

    expect((await cached.byKey(1))?.id).toBe(1);
    expect(cached.capabilities.paging).toBe(true);
    expect(cached.key).toBe('id');
  });

  it('clear mengosongkan cache', async () => {
    const { store } = createInner();
    const cached = new CachedStore(store);

    await cached.load();
    cached.clear();

    expect(cached.size).toBe(0);
  });
});
