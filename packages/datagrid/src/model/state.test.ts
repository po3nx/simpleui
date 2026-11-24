import { describe, expect, it, vi } from 'vitest';
import type { DataGridError } from '../errors.js';
import {
  createDefaultState,
  createGridStateStore,
  selectHiddenColumns,
  selectIsFiltered,
  selectPageCount,
  selectSelectedKeySet,
} from './state.js';

describe('createGridStateStore — default dan paging', () => {
  it('memberi state awal yang aman', () => {
    const store = createGridStateStore();
    const state = store.getState();

    expect(state.pageIndex).toBe(0);
    expect(state.pageSize).toBe(20);
    expect(state.dataStatus).toBe('idle');
    expect(state.selection).toEqual([]);
    expect(createDefaultState().sorting).toEqual([]);
  });

  it('filter dan sort mereset halaman ke 0', () => {
    const store = createGridStateStore();
    store.setPage(3);
    store.setFilter(['name', 'contains', 'a']);
    expect(store.getState().pageIndex).toBe(0);

    store.setPage(2);
    store.setSorting([{ selector: 'name', desc: false }]);
    expect(store.getState().pageIndex).toBe(0);
  });

  it('memvalidasi page dan pageSize', () => {
    const store = createGridStateStore();

    expect(() => store.setPage(-1)).toThrowError(/pageIndex/);
    expect(() => store.setPageSize(0)).toThrowError(/pageSize/);
    expect(() => store.setPageSize(2.5)).toThrowError(/pageSize/);
  });
});

describe('createGridStateStore — transaksi dan notifikasi', () => {
  it('memberi notifikasi sekali per transaksi', () => {
    const store = createGridStateStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.transaction(() => {
      store.setPage(1);
      store.setPageSize(50);
      store.setFilter(['active', 'eq', true]);
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().pageSize).toBe(50);
  });

  it('berhenti memberi notifikasi setelah unsubscribe', () => {
    const store = createGridStateStore();
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    stop();

    store.setPage(2);
    expect(listener).not.toHaveBeenCalled();
  });

  it('dispose idempoten dan menghentikan notifikasi', () => {
    const store = createGridStateStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.dispose();
    store.dispose();
    store.setPage(1);

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('createGridStateStore — selection', () => {
  it('toggle multiple menambah dan menghapus', () => {
    const store = createGridStateStore();

    store.toggleSelection(1);
    store.toggleSelection(2);
    expect(store.getState().selection).toEqual([1, 2]);

    store.toggleSelection(1);
    expect(store.getState().selection).toEqual([2]);
  });

  it('mode single mengganti selection', () => {
    const store = createGridStateStore();
    store.setSelection([1, 2]);

    store.toggleSelection(3, 'single');
    expect(store.getState().selection).toEqual([3]);
  });

  it('selectAll menggabungkan tanpa duplikat, clear mengosongkan', () => {
    const store = createGridStateStore();
    store.setSelection([1, 2]);

    store.selectAll([2, 3]);
    expect(store.getState().selection).toEqual([1, 2, 3]);

    store.clearSelection();
    expect(store.getState().selection).toEqual([]);
  });
});

describe('createGridStateStore — kolom dan group', () => {
  it('menyimpan lebar, urutan, dan visibilitas kolom', () => {
    const store = createGridStateStore();

    store.setColumnWidth('total', 160);
    store.setColumnOrder(['total', 'id', 'total']);
    store.setColumnHidden('id', true);
    store.setColumnHidden('city', true);
    store.setColumnHidden('id', false);

    expect(store.getState().columnWidths).toEqual({ total: 160 });
    expect(store.getState().columnOrder).toEqual(['total', 'id']);
    expect(store.getState().hiddenColumns).toEqual(['city']);

    expect(() => store.setColumnWidth('id', 0)).toThrowError(/lebar/);
  });

  it('mengatur group dan ekspansi', () => {
    const store = createGridStateStore();

    store.setGroupBy(['city', 'city']);
    store.toggleGroupExpanded('Jakarta');
    expect(store.getState().groupBy).toEqual(['city']);
    expect(store.getState().expandedGroups).toEqual(['Jakarta']);
  });
});

describe('createGridStateStore — status state machine', () => {
  it('mengikuti transisi yang valid', () => {
    const store = createGridStateStore();

    store.setStatus('loading');
    store.setStatus('loaded');
    expect(store.getState().dataStatus).toBe('loaded');

    store.setStatus('loading');
    store.setStatus('error');
    expect(store.getState().dataStatus).toBe('error');
  });

  it('menolak transisi tidak valid dengan SUI-DG-009', () => {
    const store = createGridStateStore();

    try {
      store.setStatus('loaded');
      expect.unreachable('harus melempar');
    } catch (error) {
      expect((error as DataGridError).code).toBe('SUI-DG-009');
    }
  });
});

describe('createGridStateStore — snapshot', () => {
  it('roundtrip mempertahankan state persistensi (tanpa selection)', () => {
    const source = createGridStateStore();
    source.setSorting([{ selector: 'name', desc: true }]);
    source.setFilter(['active', 'eq', true]);
    source.setPageSize(50);
    source.setPage(2);
    source.setColumnWidth('name', 180);
    source.setColumnOrder(['name', 'id']);
    source.setColumnHidden('id', true);
    source.setGroupBy(['city']);
    source.setSelection([1, 2]);

    const target = createGridStateStore();
    target.restore(source.toSnapshot());

    expect(target.getState()).toMatchObject({
      sorting: [{ selector: 'name', desc: true }],
      filterValue: ['active', 'eq', true],
      pageIndex: 2,
      pageSize: 50,
      columnWidths: { name: 180 },
      columnOrder: ['name', 'id'],
      hiddenColumns: ['id'],
      groupBy: ['city'],
      selection: [],
    });
  });

  it('menolak snapshot tidak valid dengan SUI-DG-008', () => {
    const store = createGridStateStore();

    expect(() => store.restore({ version: 99 } as never)).toThrowError(
      /snapshot/,
    );
  });
});

describe('selector state', () => {
  it('memoized untuk state yang sama', () => {
    const store = createGridStateStore();
    const state = store.getState();

    expect(selectSelectedKeySet(state)).toBe(selectSelectedKeySet(state));
    expect(selectHiddenColumns(state)).toBe(selectHiddenColumns(state));
  });

  it('menghitung status turunan', () => {
    const store = createGridStateStore();
    store.setSelection([1, 2]);
    store.setFilter(['name', 'contains', 'a']);

    const state = store.getState();
    expect(selectSelectedKeySet(state).size).toBe(2);
    expect(selectIsFiltered(state)).toBe(true);
    expect(selectPageCount(state, 205)).toBe(11);
  });
});
