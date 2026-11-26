import type { DataStore, LoadOptions, LoadResult } from '@simpleui/core';
import { describe, expect, it, vi } from 'vitest';
import { createGridStateStore } from '../model/state.js';
import { createDataController } from './data-controller.js';

interface Row {
  id: number;
  name: string;
  city: string;
  total: number;
}

const ROWS: Row[] = [
  { id: 1, name: 'Budi', city: 'Bandung', total: 30 },
  { id: 2, name: 'Ani', city: 'Jakarta', total: 10 },
  { id: 3, name: 'Citra', city: 'Bandung', total: 20 },
  { id: 4, name: 'Dewi', city: 'Jakarta', total: 40 },
];

function createStore(
  overrides: Partial<DataStore<Row>['capabilities']> = {},
  result: LoadResult<Row> = { data: ROWS, totalCount: ROWS.length },
) {
  const calls: LoadOptions[] = [];
  const store: DataStore<Row> = {
    key: 'id',
    capabilities: {
      remote: true,
      sort: true,
      filter: true,
      group: true,
      summary: false,
      paging: true,
      crud: false,
      ...overrides,
    },
    load: vi.fn(async (options: LoadOptions = {}) => {
      calls.push(options);
      return result;
    }),
    byKey: vi.fn(async (key) => ROWS.find((row) => row.id === key)),
  };
  return { store, calls };
}

function stateWith() {
  const state = createGridStateStore();
  state.setSorting([{ selector: 'name', desc: false }]);
  state.setFilter(['name', 'contains', 'a']);
  state.setPageSize(2);
  state.setPage(1);
  state.setGroupBy(['city']);
  return state;
}

describe('remoteOperations — auto pushdown', () => {
  it('mendorong sort, filter, group, dan paging sesuai capabilities', async () => {
    const { store, calls } = createStore();
    const controller = createDataController({
      dataSource: store,
      state: stateWith(),
      paging: true,
    });
    await controller.load();

    expect(calls[0]).toMatchObject({
      skip: 2,
      take: 2,
      sort: [{ selector: 'name', desc: false }],
      filter: ['name', 'contains', 'a'],
      group: [{ selector: 'city' }],
      requireTotalCount: true,
    });
    expect(controller.getRows()).toBe(ROWS);
    expect(controller.getGroups()).toEqual([]);
    controller.dispose();
  });

  it('fallback lokal saat remoteOperations=false', async () => {
    const { store, calls } = createStore();
    const controller = createDataController({
      dataSource: store,
      state: stateWith(),
      paging: true,
      remoteOperations: false,
      grouping: { maxGroupCount: 10 },
    });
    await controller.load();

    expect(calls[0]).not.toHaveProperty('sort');
    expect(calls[0]).not.toHaveProperty('filter');
    expect(calls[0]).not.toHaveProperty('group');
    expect(calls[0]).not.toHaveProperty('skip');
    expect(controller.getRows().map((row) => row.id)).toEqual([]);
    expect(controller.getTotalCount()).toBe(2);
    const groups = controller.getGroups();
    expect(groups.map((group) => group.value)).toEqual(['Jakarta', 'Bandung']);
    controller.dispose();
  });

  it('objek parsial hanya mendorong operasi yang diaktifkan', async () => {
    const { store, calls } = createStore();
    const controller = createDataController({
      dataSource: store,
      state: stateWith(),
      paging: true,
      remoteOperations: {
        filtering: true,
        sorting: false,
        grouping: false,
        paging: false,
      },
    });
    await controller.load();

    expect(calls[0]?.filter).toEqual(['name', 'contains', 'a']);
    expect(calls[0]).not.toHaveProperty('sort');
    expect(calls[0]).not.toHaveProperty('skip');
    expect(calls[0]).not.toHaveProperty('group');
    expect(controller.getRows().map((row) => row.id)).toEqual([3, 4]);
    expect(controller.getGroups().length).toBeGreaterThan(0);
    controller.dispose();
  });

  it('memakai fallback lokal saat store tidak mendukung group', async () => {
    const { store, calls } = createStore({ group: false });
    const controller = createDataController({
      dataSource: store,
      state: stateWith(),
      paging: true,
    });
    await controller.load();

    expect(calls[0]).not.toHaveProperty('group');
    expect(controller.getGroups()).toHaveLength(2);
    expect(controller.getGroups()[0]?.count).toBe(2);
    controller.dispose();
  });

  it('mengabaikan pushdown group jika store melaporkan tidak mendukung', async () => {
    const { store, calls } = createStore({ group: false, sort: false });
    const controller = createDataController({
      dataSource: store,
      state: stateWith(),
      paging: true,
      remoteOperations: { grouping: true },
    });
    await controller.load();

    expect(calls[0]).not.toHaveProperty('group');
    expect(calls[0]?.sort).toBeUndefined();
    expect(controller.getRows().map((row) => row.id)).toEqual([2, 1, 3, 4]);
    expect(controller.getTotalCount()).toBe(4);
    expect(controller.getGroups()).toHaveLength(2);
    controller.dispose();
  });
});
