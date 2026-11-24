import { describe, expect, it, vi } from 'vitest';
import type { DataGridError } from '../errors.js';
import {
  countHeaderRows,
  findColumnById,
  flattenColumns,
  getVisibleColumns,
  normalizeColumnModel,
} from './columns.js';

interface Order {
  id: number;
  total: number;
  active: boolean;
}

describe('normalizeColumnModel — dasar', () => {
  it('menerima string shorthand', () => {
    const columns = normalizeColumnModel<Order>(['id', 'total']);

    expect(columns).toHaveLength(2);
    expect(columns[0]).toMatchObject({
      id: 'id',
      dataField: 'id',
      caption: 'id',
      dataType: 'string',
      alignment: 'start',
    });
  });

  it('memakai id eksplisit dan caption', () => {
    const [column] = normalizeColumnModel<Order>([
      { id: 'total-col', dataField: 'total', caption: 'Total', width: 120 },
    ]);

    expect(column?.id).toBe('total-col');
    expect(column?.caption).toBe('Total');
    expect(column?.width).toBe(120);
  });

  it('memberi id col-<index> untuk kolom tanpa field', () => {
    const [column] = normalizeColumnModel([{ caption: 'Aksi' }]);

    expect(column?.id).toBe('col-0');
    expect(column?.caption).toBe('Aksi');
  });

  it('id stabil meski urutan berubah', () => {
    const first = normalizeColumnModel<Order>(['id', 'total']);
    const second = normalizeColumnModel<Order>(['total', 'id']);

    expect(first.map((column) => column.id)).toEqual(['id', 'total']);
    expect(second.map((column) => column.id)).toEqual(['total', 'id']);
  });
});

describe('normalizeColumnModel — lebar dan alignment', () => {
  it('menjepit lebar ke min/max', () => {
    const [narrow, wide, auto] = normalizeColumnModel<Order>([
      { dataField: 'id', width: 20, minWidth: 80 },
      { dataField: 'total', width: 900, maxWidth: 300 },
      { dataField: 'active' },
    ]);

    expect(narrow?.width).toBe(80);
    expect(wide?.width).toBe(300);
    expect(auto?.width).toBe('auto');
  });

  it('alignment default mengikuti dataType', () => {
    const [text, number, bool, currency] = normalizeColumnModel<Order>([
      { dataField: 'id' },
      { dataField: 'total', dataType: 'number' },
      { dataField: 'active', dataType: 'boolean' },
      { dataField: 'total', id: 'c', dataType: 'currency' },
    ]);

    expect(text?.alignment).toBe('start');
    expect(number?.alignment).toBe('end');
    expect(bool?.alignment).toBe('center');
    expect(currency?.alignment).toBe('end');
  });

  it('fixed true menjadi start', () => {
    const [column] = normalizeColumnModel<Order>([
      { dataField: 'id', fixed: true },
    ]);
    expect(column?.fixed).toBe('start');
  });
});

describe('normalizeColumnModel — band', () => {
  const columns = normalizeColumnModel<Order>([
    { dataField: 'id' },
    {
      id: 'money',
      caption: 'Keuangan',
      columns: [
        { dataField: 'total', caption: 'Total' },
        { dataField: 'active', caption: 'Aktif' },
      ],
    },
  ]);

  it('membentuk pohon dengan bandId dan depth', () => {
    expect(columns).toHaveLength(2);
    const band = columns[1];
    expect(band?.id).toBe('money');
    expect(band?.children).toHaveLength(2);
    expect(band?.children?.[0]?.bandId).toBe('money');
    expect(band?.children?.[0]?.depth).toBe(1);
    expect(countHeaderRows(columns)).toBe(2);
  });

  it('flatten hanya mengembalikan leaf', () => {
    expect(flattenColumns(columns).map((column) => column.id)).toEqual([
      'id',
      'total',
      'active',
    ]);
  });

  it('band tersembunyi menyembunyikan isinya', () => {
    const hidden = normalizeColumnModel<Order>([
      { dataField: 'id' },
      {
        id: 'money',
        visible: false,
        columns: [{ dataField: 'total' }],
      },
    ]);

    expect(getVisibleColumns(hidden).map((column) => column.id)).toEqual([
      'id',
    ]);
  });

  it('menemukan kolom berdasarkan id', () => {
    expect(findColumnById(columns, 'total')?.caption).toBe('Total');
    expect(findColumnById(columns, 'money')?.children).toHaveLength(2);
    expect(findColumnById(columns, 'tidak-ada')).toBeUndefined();
  });
});

describe('normalizeColumnModel — validasi', () => {
  it('menolak id duplikat dengan SUI-DG-002', () => {
    try {
      normalizeColumnModel([{ dataField: 'id' }, { dataField: 'id' }]);
      expect.unreachable('harus melempar');
    } catch (error) {
      expect((error as DataGridError).code).toBe('SUI-DG-002');
    }
  });

  it('menolak band dengan dataField', () => {
    expect(() =>
      normalizeColumnModel([
        { dataField: 'id', columns: [{ dataField: 'total' }] },
      ]),
    ).toThrowError(/band tidak boleh punya dataField/);
  });

  it('menolak fixed dan lebar tidak valid', () => {
    expect(() =>
      normalizeColumnModel([{ dataField: 'id', fixed: 'tengah' as never }]),
    ).toThrowError(/fixed/);
    expect(() =>
      normalizeColumnModel([{ dataField: 'id', maxWidth: 10, minWidth: 80 }]),
    ).toThrowError(/maxWidth/);
  });

  it('mode produksi mengganti nama id duplikat dan melapor', () => {
    const onValidationError = vi.fn();
    const columns = normalizeColumnModel(
      [{ dataField: 'id' }, { dataField: 'id' }],
      { devMode: false, onValidationError },
    );

    expect(columns.map((column) => column.id)).toEqual(['id', 'id-2']);
    expect(onValidationError).toHaveBeenCalledWith({
      path: 'columns[1]',
      message: 'id kolom duplikat: id',
    });
  });
});
