import { ArrayStore, type DataStore } from '@simpleui/core';
import { describe, expect, it, vi } from 'vitest';
import { createLookupResolver } from './lookup.js';

const CITIES: Record<string, unknown>[] = [
  { id: 1, name: 'Jakarta' },
  { id: 2, name: 'Bandung' },
  { id: 3, name: 'Surabaya' },
];

function setup() {
  const store = new ArrayStore<Record<string, unknown>>(CITIES, { key: 'id' });
  const resolver = createLookupResolver({
    store,
    valueExpr: 'id',
    textExpr: 'name',
  });
  return { store, resolver };
}

describe('lookup resolver', () => {
  it('memuat label batch dan menyimpannya di cache', async () => {
    const { resolver } = setup();
    await resolver.ensure([1, 2, 1]);
    expect(resolver.getLabel(1)).toBe('Jakarta');
    expect(resolver.getLabel('2')).toBe('Bandung');
    expect(resolver.getLabel(99)).toBeUndefined();

    const calls = vi.spyOn(ArrayStore.prototype, 'load');
    await resolver.ensure([1, 2]);
    expect(calls).not.toHaveBeenCalled();
    calls.mockRestore();
  });

  it('search memakai filter contains dan menghormati minSearchLength', async () => {
    const store = new ArrayStore<Record<string, unknown>>(CITIES, {
      key: 'id',
    });
    const load = vi.spyOn(store, 'load');
    const resolver = createLookupResolver({
      store,
      valueExpr: 'id',
      textExpr: 'name',
      minSearchLength: 2,
      pageSize: 2,
    });
    await expect(resolver.search('a')).resolves.toEqual([]);
    expect(load).not.toHaveBeenCalled();

    const items = await resolver.search('an');
    expect(items.length).toBeGreaterThan(0);
    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: ['name', 'contains', 'an'],
        take: 2,
      }),
    );
  });

  it('searchEnabled=false menolak query tapi mengizinkan daftar awal', async () => {
    const store = new ArrayStore<Record<string, unknown>>(CITIES, {
      key: 'id',
    });
    const resolver = createLookupResolver({
      store,
      valueExpr: 'id',
      textExpr: 'name',
      searchEnabled: false,
    });
    expect(await resolver.search('a')).toEqual([]);
    expect((await resolver.search('')).length).toBe(3);
  });

  it('mengembalikan undefined/array kosong saat store gagal', async () => {
    const store: DataStore<Record<string, unknown>> = {
      key: 'id',
      capabilities: {
        remote: true,
        sort: true,
        filter: true,
        group: false,
        summary: false,
        paging: true,
        crud: false,
      },
      load: async () => {
        throw new Error('offline');
      },
      byKey: async () => undefined,
    };
    const resolver = createLookupResolver({
      store,
      valueExpr: 'id',
      textExpr: 'name',
    });
    await expect(resolver.ensure([1])).resolves.toBeUndefined();
    expect(resolver.getLabel(1)).toBeUndefined();
    expect(await resolver.search('a')).toEqual([]);
  });

  it('clear menghapus cache', async () => {
    const { resolver } = setup();
    await resolver.ensure([1]);
    resolver.clear();
    expect(resolver.getLabel(1)).toBeUndefined();
  });
});
