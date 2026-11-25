import { describe, expect, it } from 'vitest';
import { DataGridError } from '../errors.js';
import { normalizeColumnModel } from './columns.js';
import { createFocusModel } from './focus.js';
import { createGridStateStore } from './state.js';

interface Row {
  id: number;
}

const ROWS = [{ id: 1 }, { id: 2 }, { id: 3 }];
const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'id' },
  { dataField: 'id', id: 'second' },
  { dataField: 'id', id: 'hidden', visible: false },
  { dataField: 'id', id: 'third' },
]);

function setup(columns = COLUMNS, rows = ROWS) {
  const state = createGridStateStore();
  const model = createFocusModel<Row>({
    state,
    columns,
    getRowKeys: () => rows.map((row) => row.id),
  });
  return { state, model };
}

describe('focus — inisialisasi dan tabindex', () => {
  it('belum ada fokus awal; sel pertama mendapat tabindex 0', () => {
    const { model } = setup();

    expect(model.get()).toBeNull();
    expect(model.tabIndexFor(1, 'id')).toBe(0);
    expect(model.tabIndexFor(1, 'second')).toBe(-1);
  });

  it('first memilih sel pertama yang terlihat', () => {
    const { model } = setup();
    model.first();
    expect(model.get()).toEqual({ rowKey: 1, columnId: 'id' });
  });

  it('kolom tersembunyi tidak menjadi tujuan fokus', () => {
    const { model } = setup();
    model.first();
    model.move('right');
    model.move('right');
    expect(model.get()).toEqual({ rowKey: 1, columnId: 'third' });
  });
});

describe('focus — navigasi panah dengan clamp', () => {
  it('bergerak kanan/kiri tanpa melewati batas', () => {
    const { model } = setup();
    model.first();

    model.move('right');
    expect(model.get()?.columnId).toBe('second');

    model.move('right');
    model.move('right');
    expect(model.get()?.columnId).toBe('third');

    model.move('left');
    model.move('left');
    model.move('left');
    expect(model.get()?.columnId).toBe('id');
  });

  it('bergerak atas/bawah dengan clamp di kedua ujung', () => {
    const { model } = setup();
    model.first();

    model.move('up');
    expect(model.get()?.rowKey).toBe(1);

    model.move('down');
    model.move('down');
    model.move('down');
    expect(model.get()?.rowKey).toBe(3);
  });

  it('move tanpa fokus memulai dari sel pertama', () => {
    const { model } = setup();
    model.move('down');
    expect(model.get()).toEqual({ rowKey: 1, columnId: 'id' });
  });

  it('grid kosong menghapus fokus', () => {
    const { model } = setup(COLUMNS, []);
    model.first();
    model.move('down');
    expect(model.get()).toBeNull();
  });
});

describe('focus — Home/End', () => {
  it('pindah ke ujung baris', () => {
    const { model } = setup();
    model.first();
    model.move('right');

    model.moveTo('end', 'row');
    expect(model.get()).toEqual({ rowKey: 1, columnId: 'third' });

    model.moveTo('start', 'row');
    expect(model.get()).toEqual({ rowKey: 1, columnId: 'id' });
  });

  it('pindah ke ujung grid', () => {
    const { model } = setup();
    model.moveTo('end');
    expect(model.get()).toEqual({ rowKey: 3, columnId: 'third' });

    model.moveTo('start');
    expect(model.get()).toEqual({ rowKey: 1, columnId: 'id' });
  });
});

describe('focus — validasi dan pemulihan', () => {
  it('menolak sel di luar baris/kolom terlihat', () => {
    const { model } = setup();
    expect(() => model.set({ rowKey: 9, columnId: 'id' })).toThrowError(
      DataGridError,
    );
    expect(() => model.set({ rowKey: 1, columnId: 'hidden' })).toThrowError(
      /terlihat/,
    );
  });

  it('focusRow mempertahankan kolom aktif', () => {
    const { model } = setup();
    model.first();
    model.move('right');

    model.focusRow(2);
    expect(model.get()).toEqual({ rowKey: 2, columnId: 'second' });
  });

  it('restore mempertahankan fokus valid dan memperbaiki kolom hilang', () => {
    const { model, state } = setup();
    model.first();
    expect(model.restore()).toEqual({ rowKey: 1, columnId: 'id' });

    state.setFocusedCell({ rowKey: 2, columnId: 'terhapus' });
    expect(model.restore()).toEqual({ rowKey: 2, columnId: 'id' });
  });

  it('restore menghapus fokus bila baris hilang', () => {
    const { model, state } = setup();
    state.setFocusedCell({ rowKey: 99, columnId: 'id' });

    expect(model.restore()).toBeNull();
    expect(model.get()).toBeNull();
  });

  it('cellDomId meng-encode key dan kolom', () => {
    const { model } = setup();
    expect(model.cellDomId(1, 'id')).toBe('sui-row-n:1-id');
    expect(model.cellDomId('a b', 'kol om')).toBe('sui-row-s:a%20b-kol%20om');
  });
});
