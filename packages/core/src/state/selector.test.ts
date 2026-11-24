import { describe, expect, it, vi } from 'vitest';
import { createSelector } from './selector.js';

interface State {
  rows: number[];
  filter: string;
}

describe('createSelector', () => {
  it('mengembalikan hasil seleksi', () => {
    const select = createSelector((state: State) => state.rows.length);

    expect(select({ rows: [1, 2], filter: '' })).toBe(2);
  });

  it('tidak menghitung ulang untuk state yang sama', () => {
    const spy = vi.fn((state: State) => state.rows.length);
    const select = createSelector(spy);
    const state: State = { rows: [1], filter: '' };

    select(state);
    select(state);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('menghitung ulang untuk state baru', () => {
    const select = createSelector((state: State) => state.rows.length);

    expect(select({ rows: [1], filter: '' })).toBe(1);
    expect(select({ rows: [1, 2], filter: '' })).toBe(2);
  });

  it('mempertahankan hasil lama bila dianggap sama (isEqual)', () => {
    const select = createSelector(
      (state: State) => state.rows.filter((row) => row > 1),
      (a: number[], b: number[]) =>
        a.length === b.length && a.every((value, index) => value === b[index]),
    );

    const first = select({ rows: [1, 2, 3], filter: '' });
    const second = select({ rows: [1, 2, 3], filter: 'berubah' });

    expect(second).toBe(first);
  });

  it('mengembalikan hasil baru bila isEqual menolak', () => {
    const select = createSelector((state: State) =>
      state.rows.filter((row) => row > 1),
    );

    const first = select({ rows: [1, 2, 3], filter: '' });
    const second = select({ rows: [1, 2, 3], filter: 'berubah' });

    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });
});
