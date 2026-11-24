import type { DataStore, LoadOptions } from '@simpleui/core';
import { describe, expect, it, vi } from 'vitest';
import { DataGridError } from '../errors.js';
import { createGridStateStore } from '../model/state.js';
import { createDataController } from './data-controller.js';

interface Row {
  id: number;
  name: string;
  active: boolean;
}

const ROWS: Row[] = [
  { id: 1, name: 'Budi', active: true },
  { id: 2, name: 'Ani', active: false },
  { id: 3, name: 'Citra', active: true },
];

function deferredStore() {
  const calls: LoadOptions[] = [];
  const pending: Array<{
    resolve: (value: { data: Row[]; totalCount: number }) => void;
    reject: (error: unknown) => void;
  }> = [];

  const store: DataStore<Row> = {
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
    load(options = {}) {
      calls.push(options);
      return new Promise((resolve, reject) => {
        pending.push({ resolve, reject });
      });
    },
    async byKey() {
      return undefined;
    },
  };

  return { store, calls, pending };
}

describe('createDataController — data lokal', () => {
  it('memuat baris dan totalCount, serta memancarkan event', async () => {
    const state = createGridStateStore();
    const onDataLoading = vi.fn();
    const onDataLoaded = vi.fn();
    const controller = createDataController<Row>({
      dataSource: ROWS,
      state,
      paging: false,
      events: { onDataLoading, onDataLoaded },
    });

    await controller.load();

    expect(controller.getRows()).toHaveLength(3);
    expect(controller.getTotalCount()).toBe(3);
    expect(state.getState().dataStatus).toBe('loaded');
    expect(onDataLoading).toHaveBeenCalledWith({
      loadOptions: { skip: 0, take: 0 },
    });
    expect(onDataLoaded).toHaveBeenCalledWith({
      data: controller.getRows(),
      totalCount: 3,
    });
  });

  it('menerapkan sort dan filter dari state', async () => {
    const state = createGridStateStore();
    state.setFilter(['active', 'eq', true]);
    state.setSorting([{ selector: 'name', desc: false }]);

    const controller = createDataController<Row>({
      dataSource: ROWS,
      state,
      paging: false,
    });
    await controller.load();

    expect(controller.getRows().map((row) => row.name)).toEqual([
      'Budi',
      'Citra',
    ]);
  });

  it('mengirim skip/take saat paging aktif', async () => {
    const state = createGridStateStore();
    state.setPageSize(2);
    state.setPage(1);

    const { store, calls, pending } = deferredStore();
    const controller = createDataController<Row>({
      dataSource: store,
      state,
      paging: true,
    });

    const loading = controller.load();
    expect(calls[0]).toMatchObject({ skip: 2, take: 2 });
    pending[0]?.resolve({
      data: [{ id: 3, name: 'Citra', active: true }],
      totalCount: 1,
    });

    await loading;
    expect(controller.getTotalCount()).toBe(1);
  });
});

describe('createDataController — store remote', () => {
  it('meneruskan signal dan opsi ke store', async () => {
    const state = createGridStateStore();
    const { store, calls, pending } = deferredStore();
    const controller = createDataController<Row>({
      dataSource: store,
      state,
      paging: true,
    });

    const loading = controller.load();
    expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);

    pending[0]?.resolve({ data: ROWS, totalCount: 10 });
    await loading;

    expect(controller.getRows()).toHaveLength(3);
    expect(state.getState().dataStatus).toBe('loaded');
  });

  it('membatalkan permintaan lama saat load berikutnya', async () => {
    const state = createGridStateStore();
    const { store, pending } = deferredStore();
    const controller = createDataController<Row>({
      dataSource: store,
      state,
      paging: false,
    });

    const first = controller.load();
    const second = controller.load();

    const firstSignal = pending[0] as unknown as { signal: AbortSignal };
    expect(firstSignal).toBeTruthy();
    pending[1]?.resolve({ data: [ROWS[0] as Row], totalCount: 1 });
    await second;

    pending[0]?.resolve({ data: ROWS, totalCount: 3 });
    await first;

    expect(controller.getRows()).toHaveLength(1);
  });

  it('memetakan error store menjadi SUI-DG-004', async () => {
    const state = createGridStateStore();
    const { store, pending } = deferredStore();
    const onDataError = vi.fn();
    const controller = createDataController<Row>({
      dataSource: store,
      state,
      paging: false,
      events: { onDataError },
    });

    const loading = controller.load();
    pending[0]?.reject(new Error('jaringan'));
    await expect(loading).rejects.toBeInstanceOf(DataGridError);

    expect(state.getState().dataStatus).toBe('error');
    expect(onDataError).toHaveBeenCalledTimes(1);
  });

  it('dispose membatalkan permintaan dan mengabaikan hasil', async () => {
    const state = createGridStateStore();
    const { store, pending } = deferredStore();
    const controller = createDataController<Row>({
      dataSource: store,
      state,
      paging: false,
    });

    const loading = controller.load();
    controller.dispose();
    pending[0]?.resolve({ data: ROWS, totalCount: 3 });
    await loading;

    expect(controller.getRows()).toHaveLength(0);
    expect(controller.getTotalCount()).toBe(0);
  });
});

describe('createDataController — key dan pencarian baris', () => {
  it('mendukung key string, composite, dan fungsi', async () => {
    const state = createGridStateStore();
    const single = createDataController<Row>({
      dataSource: ROWS,
      state,
      paging: false,
    });
    await single.load();
    expect(single.getKey(ROWS[0] as Row)).toBe(1);
    expect(single.getRowByKey(2)?.name).toBe('Ani');

    interface Pair {
      a: number;
      b: number;
    }
    const composite = createDataController<Pair>({
      dataSource: [{ a: 1, b: 2 }],
      keyExpr: ['a', 'b'],
      state,
      paging: false,
    });
    await composite.load();
    expect(composite.getKey({ a: 1, b: 2 })).toBe('1\u00002');

    const functional = createDataController<Row>({
      dataSource: ROWS,
      keyExpr: (row) => `k-${row.id}`,
      state,
      paging: false,
    });
    await functional.load();
    expect(functional.getKey(ROWS[0] as Row)).toBe('k-1');
  });

  it('menolak array tanpa id dan tanpa keyExpr', () => {
    const state = createGridStateStore();
    expect(() =>
      createDataController<{ name: string }>({
        dataSource: [{ name: 'Ani' }],
        state,
        paging: false,
      }),
    ).toThrowError(DataGridError);
  });
});
