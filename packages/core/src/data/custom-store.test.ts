import { describe, expect, it, vi } from 'vitest';
import { CustomStore } from './custom-store.js';
import { DataError } from './errors.js';

interface Row {
  id: number;
  name: string;
}

const validResult = { data: [{ id: 1, name: 'A' }], totalCount: 1 };

describe('CustomStore', () => {
  it('meneruskan opsi ke callback dan memvalidasi hasil', async () => {
    const load = vi.fn(async () => validResult);
    const store = new CustomStore<Row>({ key: 'id', load });

    const result = await store.load({ take: 10 });

    expect(load).toHaveBeenCalledWith({ take: 10 });
    expect(result.data).toHaveLength(1);
  });

  it('menolak bentuk respons yang salah (SUI-DATA-002)', async () => {
    const store = new CustomStore<Row>({
      key: 'id',
      load: async () => ({ data: 'bukan array' }) as never,
    });

    await expect(store.load()).rejects.toThrowError(/SUI-DATA-002/);
  });

  it('menolak totalCount negatif', async () => {
    const store = new CustomStore<Row>({
      key: 'id',
      load: async () => ({ data: [], totalCount: -1 }),
    });

    await expect(store.load()).rejects.toThrowError(/SUI-DATA-002/);
  });

  it('menormalkan AbortError menjadi SUI-DATA-005', async () => {
    const abort = new Error('dibatalkan');
    abort.name = 'AbortError';
    const store = new CustomStore<Row>({
      key: 'id',
      load: async () => {
        throw abort;
      },
    });

    try {
      await store.load();
      expect.unreachable('harus melempar');
    } catch (error) {
      expect((error as DataError).code).toBe('SUI-DATA-005');
    }
  });

  it('menormalkan error lain menjadi SUI-DATA-002 yang retryable', async () => {
    const store = new CustomStore<Row>({
      key: 'id',
      load: async () => {
        throw new Error('jaringan');
      },
    });

    try {
      await store.load();
      expect.unreachable('harus melempar');
    } catch (error) {
      expect((error as DataError).code).toBe('SUI-DATA-002');
      expect((error as DataError).retryable).toBe(true);
      expect((error as DataError).cause).toBeInstanceOf(Error);
    }
  });

  it('meneruskan DataError apa adanya', async () => {
    const origin = new DataError('SUI-DATA-006', 'terlalu besar');
    const store = new CustomStore<Row>({
      key: 'id',
      load: async () => {
        throw origin;
      },
    });

    await expect(store.load()).rejects.toThrowError(origin);
  });

  it('menolak operasi yang tidak disediakan dengan SUI-DATA-008', async () => {
    const store = new CustomStore<Row>({
      key: 'id',
      load: async () => validResult,
    });

    await expect(store.byKey(1)).rejects.toThrowError(/SUI-DATA-008/);
    await expect(store.insert({})).rejects.toThrowError(/SUI-DATA-008/);
    await expect(store.update(1, {})).rejects.toThrowError(/SUI-DATA-008/);
    await expect(store.remove(1)).rejects.toThrowError(/SUI-DATA-008/);
  });

  it('mendelegasikan CRUD dan byKey bila disediakan', async () => {
    const store = new CustomStore<Row>({
      key: 'id',
      load: async () => validResult,
      byKey: async (key) => ({ id: Number(key), name: 'A' }),
      insert: async (values) => ({ id: 2, name: 'B', ...values }),
      update: async (key, values) => ({
        id: Number(key),
        name: 'C',
        ...values,
      }),
      remove: async () => {},
      capabilities: { crud: true },
    });

    expect((await store.byKey(1))?.id).toBe(1);
    expect((await store.insert({ name: 'B' })).id).toBe(2);
    expect((await store.update(3, { name: 'C' })).id).toBe(3);
    await expect(store.remove(1)).resolves.toBeUndefined();
    expect(store.capabilities.crud).toBe(true);
  });

  it('menggabungkan capabilities default dengan override', () => {
    const store = new CustomStore<Row>({
      key: 'id',
      load: async () => validResult,
      capabilities: { filter: true },
    });

    expect(store.capabilities).toMatchObject({
      remote: true,
      filter: true,
      sort: false,
    });
  });
});
