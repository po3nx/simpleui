import { describe, expect, it, vi } from 'vitest';
import { DataGridError } from '../errors.js';
import { createKeyResolver } from './key.js';
import { createSelectionModel } from './selection.js';
import { createGridStateStore } from './state.js';

interface Row {
  id: number;
}

const RESOLVER = createKeyResolver<Row>('id');
const ROWS: Row[] = [{ id: 1 }, { id: 2 }, { id: 3 }];

function setup(
  mode: 'none' | 'single' | 'multiple' = 'multiple',
  extra: {
    supportsSelectAllPages?: boolean;
    onChange?: (event: unknown) => void;
  } = {},
) {
  const state = createGridStateStore();
  const model = createSelectionModel<Row>({
    state,
    mode,
    ...extra,
  });
  return { state, model };
}

describe('selection — mode', () => {
  it('mode none mengabaikan semua perubahan', () => {
    const { state, model } = setup('none');
    model.toggle(1);
    model.setSelectedKeys([1, 2]);
    model.selectAll([1, 2]);
    model.selectRange([1, 2, 3], 0, 2);

    expect(model.getSelectedKeys()).toEqual([]);
    expect(state.getState().selection).toEqual([]);
  });

  it('mode single mengganti dan toggle key yang sama menghapus', () => {
    const { model } = setup('single');

    model.toggle(1);
    model.toggle(2);
    expect(model.getSelectedKeys()).toEqual([2]);

    model.toggle(2);
    expect(model.getSelectedKeys()).toEqual([]);

    model.setSelectedKeys([1, 2, 3]);
    expect(model.getSelectedKeys()).toEqual([3]);
  });

  it('mode multiple menambah dan menghapus', () => {
    const { model } = setup('multiple');

    model.toggle(1);
    model.toggle(2);
    expect(model.getSelectedKeys()).toEqual([1, 2]);

    model.toggle(1);
    expect(model.getSelectedKeys()).toEqual([2]);
  });
});

describe('selection — event diff', () => {
  it('memancarkan added/removed saat berubah', () => {
    const onChange = vi.fn();
    const { model } = setup('multiple', { onChange });

    model.toggle(1);
    expect(onChange).toHaveBeenLastCalledWith({
      selectedRowKeys: [1],
      added: [1],
      removed: [],
    });

    model.setSelectedKeys([1, 2]);
    expect(onChange).toHaveBeenLastCalledWith({
      selectedRowKeys: [1, 2],
      added: [2],
      removed: [],
    });

    model.toggle(1);
    expect(onChange).toHaveBeenLastCalledWith({
      selectedRowKeys: [2],
      added: [],
      removed: [1],
    });
  });

  it('tidak memancarkan event bila selection sama', () => {
    const onChange = vi.fn();
    const { model } = setup('multiple', { onChange });

    model.setSelectedKeys([1, 2]);
    onChange.mockClear();
    model.setSelectedKeys([2, 1]);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('dispose menghentikan event', () => {
    const onChange = vi.fn();
    const { model } = setup('multiple', { onChange });

    model.toggle(1);
    model.dispose();
    model.toggle(2);

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('selection — range dan select all', () => {
  it('range multiple inklusif; single memilih yang terakhir', () => {
    const multiple = setup('multiple').model;
    multiple.selectRange([1, 2, 3, 4], 1, 3);
    expect(multiple.getSelectedKeys()).toEqual([2, 3, 4]);

    const single = setup('single').model;
    single.selectRange([1, 2, 3, 4], 1, 3);
    expect(single.getSelectedKeys()).toEqual([4]);
  });

  it('range membalik indeks dengan benar', () => {
    const { model } = setup('multiple');
    model.selectRange([1, 2, 3], 2, 0);
    expect(model.getSelectedKeys()).toEqual([1, 2, 3]);
  });

  it('select all page menggabungkan, allPages butuh dukungan store', () => {
    const pageOnly = setup('multiple').model;
    pageOnly.selectAll([1, 2]);
    expect(pageOnly.getSelectedKeys()).toEqual([1, 2]);

    expect(() => pageOnly.selectAll([3], 'allPages')).toThrowError(
      DataGridError,
    );

    const supported = setup('multiple', { supportsSelectAllPages: true }).model;
    supported.selectAll([1, 2, 3], 'allPages');
    expect(supported.getSelectedKeys()).toEqual([1, 2, 3]);
  });

  it('clear mengosongkan selection', () => {
    const { model } = setup('multiple');
    model.setSelectedKeys([1, 2]);
    model.clear();
    expect(model.getSelectedKeys()).toEqual([]);
  });
});

describe('selection — rekonsiliasi reload', () => {
  it('membuang key yang hilang dan mempertahankan yang ada', () => {
    const onChange = vi.fn();
    const { model } = setup('multiple', { onChange });
    model.setSelectedKeys([1, 3]);

    model.reconcile([{ id: 1 }, { id: 2 }], RESOLVER);

    expect(model.getSelectedKeys()).toEqual([1]);
    expect(onChange).toHaveBeenLastCalledWith({
      selectedRowKeys: [1],
      added: [],
      removed: [3],
    });
  });

  it('menolak baris duplikat saat rekonsiliasi', () => {
    const { model } = setup('multiple');
    expect(() =>
      model.reconcile([{ id: 1 }, { id: 1 }], RESOLVER),
    ).toThrowError(/duplikat/);
  });

  it('mengembalikan salinan selection', () => {
    const { model } = setup('multiple');
    model.setSelectedKeys([1]);

    const snapshot = model.getSelectedKeys() as number[];
    snapshot.push(2);

    expect(model.getSelectedKeys()).toEqual([1]);
    expect(ROWS).toHaveLength(3);
  });
});
