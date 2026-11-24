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
