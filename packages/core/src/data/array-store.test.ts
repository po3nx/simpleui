import { describe, expect, it } from 'vitest';
import { ArrayStore } from './array-store.js';

interface Row {
  id: number;
  name: string;
  age: number | null;
}

const rows: Row[] = [
  { id: 1, name: 'Budi', age: 30 },
  { id: 2, name: 'Ani', age: 25 },
  { id: 3, name: 'Citra', age: null },
];

describe('ArrayStore', () => {
  it('menyalin input sehingga array consumer tidak dimutasi', async () => {
    const source: Row[] = [{ id: 1, name: 'A', age: 1 }];
    const store = new ArrayStore(source, { key: 'id' });

    const first = source[0];
    if (!first) throw new Error('data uji kosong');
    first.name = 'berubah';

    const loaded = await store.load();

    expect(loaded.data[0]?.name).toBe('A');
    expect(store.snapshot()[0]?.name).toBe('A');
  });

  it('load menjalankan filter, sort, dan page dengan total count', async () => {
    const store = new ArrayStore(rows, { key: 'id' });

    const result = await store.load({
      filter: ['age', 'isNotNull'],
      sort: [{ selector: 'age', desc: true }],
      skip: 0,
      take: 1,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe(1);
    expect(result.totalCount).toBe(2);
  });

  it('mengembalikan salinan dari load sehingga aman dimutasi', async () => {
    const store = new ArrayStore(rows, { key: 'id' });
    const result = await store.load();

    (result.data[0] as Row).name = 'diubah';

    expect((await store.byKey(1))?.name).toBe('Budi');
  });

  it('menolak key duplikat saat konstruksi', () => {
    expect(
      () =>
        new ArrayStore(
          [
            { id: 1, name: 'A', age: 1 },
            { id: 1, name: 'B', age: 2 },
          ],
          { key: 'id' },
        ),
    ).toThrowError(/SUI-DATA-003/);
  });

  it('mendukung insert, update, dan remove', async () => {
    const store = new ArrayStore(rows, { key: 'id' });

    await store.insert({ id: 4, name: 'Dewi', age: 40 });
    expect(store.size).toBe(4);

    const updated = await store.update(4, { age: 41 });
    expect(updated.age).toBe(41);

    await store.remove(4);
    expect(store.size).toBe(3);
    expect(await store.byKey(4)).toBeUndefined();
  });

  it('menolak insert dengan key duplikat', async () => {
    const store = new ArrayStore(rows, { key: 'id' });
    await expect(
      store.insert({ id: 1, name: 'X', age: 1 }),
    ).rejects.toThrowError(/SUI-DATA-003/);
  });

  it('menolak update yang membuat key duplikat', async () => {
    const store = new ArrayStore(rows, { key: 'id' });
    await expect(store.update(1, { id: 2 })).rejects.toThrowError(
      /SUI-DATA-003/,
    );
  });

  it('menolak update/remove untuk baris yang tidak ada', async () => {
    const store = new ArrayStore(rows, { key: 'id' });
    await expect(store.update(99, { name: 'x' })).rejects.toThrowError(
      /SUI-DATA-001/,
    );
    await expect(store.remove(99)).rejects.toThrowError(/SUI-DATA-001/);
  });

  it('mendukung composite key', async () => {
    interface Pair {
      a: number;
      b: number;
      label: string;
    }
    const store = new ArrayStore<Pair>([{ a: 1, b: 2, label: 'x' }], {
      key: ['a', 'b'],
    });

    expect((await store.byKey('1\u00002'))?.label).toBe('x');
    await expect(store.insert({ a: 1, b: 2, label: 'y' })).rejects.toThrowError(
      /SUI-DATA-003/,
    );
  });
});
