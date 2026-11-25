import { ArrayStore } from '@simpleui/core';
import { describe, expect, it, vi } from 'vitest';
import { DataGridError } from '../errors.js';
import { normalizeDataGridOptions } from './options.js';

interface Order {
  id: number;
  total: number;
}

describe('normalizeDataGridOptions — default', () => {
  it('memberi default aman tanpa opsi', () => {
    const options = normalizeDataGridOptions<Order>();

    expect(options.dataSource).toEqual([]);
    expect(options.columns).toEqual([]);
    expect(options.paging.pageSize).toBe(20);
    expect(options.paging.pageIndex).toBe(0);
    expect(options.scrolling.mode).toBe('virtual');
    expect(options.scrolling.rowHeight).toBe(40);
    expect(options.selection.mode).toBe('none');
    expect(options.editing.mode).toBe('none');
    expect(options.display.showBorders).toBe(true);
    expect(options.display.width).toBe('100%');
    expect(options.display.messages).toEqual({});
  });

  it('menginfer keyExpr "id" untuk data lokal', () => {
    const options = normalizeDataGridOptions<Order>({
      dataSource: [{ id: 1, total: 10 }],
    });

    expect(options.keyExpr).toBe('id');
  });

  it('memakai key store untuk data remote', () => {
    const store = new ArrayStore<Order>([], { key: 'id' });
    const options = normalizeDataGridOptions<Order>({ dataSource: store });

    expect(options.keyExpr).toBe('id');
  });

  it('tidak memutasi input', () => {
    const input = { selection: { mode: 'multiple' as const } };
    const snapshot = structuredClone(input);

    normalizeDataGridOptions(input);

    expect(input).toEqual(snapshot);
  });
});

describe('normalizeDataGridOptions — validasi', () => {
  it('menolak opsi tak dikenal', () => {
    expect(() =>
      normalizeDataGridOptions({ unknownOption: true } as never),
    ).toThrowError(DataGridError);
  });

  it('menolak enum tidak valid dengan path', () => {
    try {
      normalizeDataGridOptions({ selection: { mode: 'banyak' as never } });
      expect.unreachable('harus melempar');
    } catch (error) {
      expect(error).toBeInstanceOf(DataGridError);
      expect((error as DataGridError).code).toBe('SUI-DG-001');
      expect((error as DataGridError).path).toBe('selection.mode');
    }
  });

  it('menolak angka di luar batas', () => {
    expect(() =>
      normalizeDataGridOptions({ paging: { pageSize: 0 } }),
    ).toThrowError(/paging\.pageSize/);
    expect(() =>
      normalizeDataGridOptions({ scrolling: { rowHeight: 10 } }),
    ).toThrowError(/scrolling\.rowHeight/);
  });

  it('menolak dataSource dan columns yang salah', () => {
    expect(() =>
      normalizeDataGridOptions({ dataSource: 42 as never }),
    ).toThrowError(/dataSource/);
    expect(() =>
      normalizeDataGridOptions({ columns: 'x' as never }),
    ).toThrowError(/columns/);
    expect(() =>
      normalizeDataGridOptions({ columns: [{ width: -1 }] }),
    ).toThrowError(/columns\[0\]\.width/);
  });

  it('menolak event handler yang bukan fungsi', () => {
    expect(() =>
      normalizeDataGridOptions({ onDataLoaded: 'x' as never }),
    ).toThrowError(/onDataLoaded/);
  });

  it('mode produksi memakai fallback dan melaporkan isu', () => {
    const onValidationError = vi.fn();
    const options = normalizeDataGridOptions(
      { paging: { pageSize: 0 } },
      { devMode: false, onValidationError },
    );

    expect(options.paging.pageSize).toBe(20);
    expect(onValidationError).toHaveBeenCalledWith({
      path: 'paging.pageSize',
      message: 'harus di antara 1 dan 10000',
    });
  });

  it('meneruskan event dan messages yang valid', () => {
    const handler = vi.fn();
    const options = normalizeDataGridOptions({
      messages: { empty: 'kosong' },
      onDataLoaded: handler,
    });

    expect(options.events['onDataLoaded']).toBe(handler);
    expect(options.display.messages).toEqual({ empty: 'kosong' });
  });
});

describe('normalizeDataGridOptions — validator per tipe', () => {
  const relax = () => {
    const onValidationError = vi.fn();
    return {
      onValidationError,
      context: { devMode: false as const, onValidationError },
    };
  };

  it('boolean tidak valid jatuh ke default dan dilaporkan', () => {
    const { onValidationError, context } = relax();
    const options = normalizeDataGridOptions(
      {
        paging: { enabled: 'yes' as never },
        showBorders: 'x' as never,
        rowAlternationEnabled: 1 as never,
      },
      context,
    );

    expect(options.paging.enabled).toBe(false);
    expect(options.display.showBorders).toBe(true);
    expect(options.display.rowAlternationEnabled).toBe(false);
    expect(onValidationError.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('angka dan enum tidak valid memakai fallback', () => {
    const { onValidationError, context } = relax();
    const options = normalizeDataGridOptions(
      {
        paging: { pageSizes: [10], pageIndex: Number.NaN as never },
        scrolling: { overscan: -1, columnRenderingMode: 'x' as never },
        editing: { mode: 'x' as never },
        grouping: { maxGroupCount: 'x' as never },
      },
      context,
    );

    expect(options.paging.pageIndex).toBe(0);
    expect(options.scrolling.overscan).toBe(5);
    expect(options.scrolling.columnRenderingMode).toBe('virtual');
    expect(options.editing.mode).toBe('none');
    expect(options.grouping.maxGroupCount).toBe(100);
    expect(onValidationError).toHaveBeenCalled();
  });

  it('string dan optional string divalidasi', () => {
    const { onValidationError, context } = relax();
    const options = normalizeDataGridOptions(
      {
        noDataText: '' as never,
        export: { fileName: '' as never },
        locale: 42 as never,
        stateStoring: { storageKey: '' as never },
      },
      context,
    );

    expect(options.display.noDataText).toBe('Tidak ada data');
    expect(options.export.fileName).toBe('simpleui-export');
    expect(options.display.locale).toBeUndefined();
    expect(options.stateStoring.storageKey).toBe('simpleui-datagrid');
    expect(onValidationError.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('locale valid dan display width/height dipertahankan', () => {
    const options = normalizeDataGridOptions({
      locale: 'id-ID',
      width: 640,
      height: '50vh',
      messages: { empty: 'kosong' },
      filtering: { filterValue: ['name', 'eq', 'a'] },
      stateStoring: {
        storage: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      },
    });

    expect(options.display.locale).toBe('id-ID');
    expect(options.display.width).toBe(640);
    expect(options.display.height).toBe('50vh');
    expect(options.display.messages).toEqual({ empty: 'kosong' });
    expect(options.filtering.filterValue).toEqual(['name', 'eq', 'a']);
  });

  it('width/height tidak valid dan messages bukan objek memakai default', () => {
    const { onValidationError, context } = relax();
    const options = normalizeDataGridOptions(
      { width: -1 as never, height: {} as never, messages: 'x' as never },
      context,
    );

    expect(options.display.width).toBe('100%');
    expect(options.display.height).toBe('auto');
    expect(options.display.messages).toEqual({});
    expect(onValidationError).toHaveBeenCalledTimes(2);
  });

  it('array string dan array biasa divalidasi', () => {
    const { onValidationError, context } = relax();
    const options = normalizeDataGridOptions(
      {
        grouping: { groupBy: [1, 2] as never },
        filtering: { search: { fields: 'name' as never } },
        sorting: { sortBy: 'x' as never },
        summary: { totalItems: 'x' as never },
      },
      context,
    );

    expect(options.grouping.groupBy).toEqual([]);
    expect(options.filtering.search.fields).toEqual([]);
    expect(options.sorting.sortBy).toEqual([]);
    expect(options.summary.totalItems).toEqual([]);
    expect(onValidationError).toHaveBeenCalledTimes(4);
  });

  it('columns tidak valid dilaporkan tanpa merusak kolom valid', () => {
    const { onValidationError, context } = relax();
    const options = normalizeDataGridOptions(
      {
        columns: [
          null as never,
          { dataField: 'id', width: 0 },
          { dataField: 1 as never },
        ],
      },
      context,
    );

    expect(options.columns).toHaveLength(2);
    expect(onValidationError.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('array string valid dan keyExpr fungsi diterima', () => {
    const options = normalizeDataGridOptions({
      grouping: { groupBy: ['city', 'total'] },
      filtering: { search: { fields: ['name'] } },
      keyExpr: (row: { id: number }) => `row-${row.id}`,
    });

    expect(options.grouping.groupBy).toEqual(['city', 'total']);
    expect(options.filtering.search.fields).toEqual(['name']);
    expect(typeof options.keyExpr).toBe('function');
  });

  it('keyExpr tidak valid ditolak', () => {
    expect(() =>
      normalizeDataGridOptions({ keyExpr: [1, 2] as never }),
    ).toThrowError(/keyExpr/);
  });
});
