import { ArrayStore, type DataStore } from '@simpleui/core';
import { describe, expect, it, vi } from 'vitest';
import { createEditingModel } from './editing-model.js';

interface Row {
  id: number;
  name: string;
  total: number;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ani', total: 10 },
  { id: 2, name: 'Budi', total: 20 },
];

function setup(
  overrides: Partial<Parameters<typeof createEditingModel<Row>>[0]> = {},
) {
  const store = new ArrayStore<Row>(ROWS, { key: 'id' });
  const onChange = vi.fn();
  const model = createEditingModel<Row>({
    store,
    keyExpr: 'id',
    rows: ROWS,
    mode: 'row',
    allowUpdating: true,
    onChange,
    ...overrides,
  });
  return { store, model, onChange };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('editing model — draft dan cancel', () => {
  it('membatalkan beginEdit lewat onEditingStart', () => {
    const onEditingStart = vi.fn((event: { cancel?: boolean }) => {
      event.cancel = true;
    });
    const { model } = setup({ onEditingStart });
    expect(model.beginEdit(1)).toBe(false);
    expect(model.getDraft()).toBeNull();
    expect(model.isDirty()).toBe(false);
  });

  it('menyimpan draft dan membatalkan lewat cancel', () => {
    const onEditingCanceled = vi.fn();
    const { model } = setup({ onEditingCanceled });
    expect(model.beginEdit(1)).toBe(true);
    model.update({ name: 'Ani Baru' });
    expect(model.getDraft()).toMatchObject({ name: 'Ani Baru' });
    expect(model.isDirty()).toBe(true);

    model.cancel();
    expect(model.isDirty()).toBe(false);
    expect(onEditingCanceled).toHaveBeenCalledWith({ rowKey: 1 });
  });
});

describe('editing model — pessimistic', () => {
  it('menunggu store lalu memperbarui baris', async () => {
    const { store, model } = setup();
    const update = vi.spyOn(store, 'update');
    model.beginEdit(1);
    model.update({ total: 99 });

    expect(model.getRows()[0]?.total).toBe(10);
    await expect(model.save()).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith(1, { total: 99 });
    expect(model.getRows()[0]?.total).toBe(99);
    expect(model.isDirty()).toBe(false);
  });

  it('rollback lokal saat store gagal', async () => {
    const onSaveFailed = vi.fn();
    const store = new ArrayStore<Row>(ROWS, { key: 'id' });
    vi.spyOn(store, 'update').mockRejectedValue(new Error('jaringan'));
    const { model } = setup({ store, onSaveFailed });
    model.beginEdit(1);
    model.update({ total: 99 });

    await expect(model.save()).resolves.toBe(false);
    expect(model.getRows()[0]?.total).toBe(10);
    expect(onSaveFailed).toHaveBeenCalled();
  });
});

describe('editing model — optimistic', () => {
  it('menerapkan lokal segera dan rollback saat gagal', async () => {
    const pending = deferred<Row>();
    const onSaveFailed = vi.fn();
    const store: DataStore<Row> = {
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
      load: async () => ({ data: ROWS }),
      byKey: async (key) => ROWS.find((row) => row.id === key),
      update: () => pending.promise,
    };
    const { model } = setup({ store, strategy: 'optimistic', onSaveFailed });
    model.beginEdit(1);
    model.update({ total: 99 });

    const saving = model.save();
    expect(model.getRows()[0]?.total).toBe(99);
    pending.reject(new Error('gagal'));
    await expect(saving).resolves.toBe(false);
    expect(model.getRows()[0]?.total).toBe(10);
    expect(onSaveFailed).toHaveBeenCalled();
  });
});

describe('editing model — transaksi batch', () => {
  it('menyimpan beberapa baris dan membatalkan semua jika satu di-cancel', async () => {
    const { model } = setup({
      mode: 'batch',
      onRowUpdating: (event) => {
        if (event.key === 2) event.cancel = true;
      },
    });
    const writes = vi.fn();
    const original = model.getRows();
    model.beginEdit(1);
    model.update({ name: 'Satu' });
    model.beginEdit(2);
    model.update({ name: 'Dua' });
    expect(model.getPending().size).toBe(2);

    await expect(model.save()).resolves.toBe(false);
    expect(writes).not.toHaveBeenCalled();
    expect(model.getRows()).toBe(original);
    expect(model.isDirty()).toBe(true);
  });
});

describe('editing model — add/remove', () => {
  it('add dan remove menghormati flag izin', async () => {
    const { model } = setup({ allowAdding: true, allowDeleting: true });
    const added = await model.add({ id: 3, name: 'Citra', total: 30 });
    expect(added?.name).toBe('Citra');
    expect(model.getRows()).toHaveLength(3);
    await expect(model.remove(3)).resolves.toBe(true);
    expect(model.getRows()).toHaveLength(2);
  });

  it('menolak add/remove saat flag false', async () => {
    const { model } = setup();
    await expect(model.add({ id: 3 })).resolves.toBeUndefined();
    await expect(model.remove(1)).resolves.toBe(false);
  });
});
