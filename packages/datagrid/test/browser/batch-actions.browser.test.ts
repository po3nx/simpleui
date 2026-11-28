import { ArrayStore } from '@simpleui/core';
import { describe, expect, it } from 'vitest';
import '../../src/styles/grid.css';
import { createEditingModel } from '../../src/data/editing-model.js';
import { createBatchActions } from '../../src/view/batch-actions.js';

interface Row {
  id: number;
  name: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Ani' },
  { id: 2, name: 'Budi' },
];

function setup() {
  const store = new ArrayStore<Row>(ROWS, { key: 'id' });
  const model = createEditingModel<Row>({
    store,
    keyExpr: 'id',
    rows: ROWS,
    mode: 'batch',
    allowUpdating: true,
  });
  const actions = createBatchActions({ model });
  document.body.append(actions.element);
  return { store, model, actions };
}

describe('batch actions toolbar', () => {
  it('menampilkan jumlah perubahan dan menyimpan semua', async () => {
    const { store, model, actions } = setup();
    model.stage(1, { name: 'Baru' });
    model.stage(2, { name: 'Juga' });
    expect(
      actions.element.querySelector('.sui-grid__batch-status')?.textContent,
    ).toContain('2 perubahan');

    actions.element
      .querySelector<HTMLButtonElement>('.sui-grid__batch-save')
      ?.click();
    await expect
      .poll(
        () =>
          actions.element.querySelector('.sui-grid__batch-status')?.textContent,
      )
      .toBe('Perubahan disimpan.');
    expect((await store.byKey(1))?.name).toBe('Baru');

    actions.dispose();
  });

  it('membatalkan semua perubahan', () => {
    const { model, actions } = setup();
    model.stage(1, { name: 'Baru' });
    actions.element
      .querySelector<HTMLButtonElement>('.sui-grid__batch-reset')
      ?.click();
    expect(model.isDirty()).toBe(false);
    expect(
      actions.element.querySelector('.sui-grid__batch-status')?.textContent,
    ).toBe('Perubahan dibatalkan.');
    actions.dispose();
  });
});
