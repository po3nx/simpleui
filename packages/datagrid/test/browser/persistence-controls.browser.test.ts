import { describe, expect, it } from 'vitest';
import '../../src/styles/grid.css';
import { createGridStateStore } from '../../src/model/state.js';
import {
  createMemoryStorage,
  createPersistenceControls,
  createStatePersistence,
} from '../../src/index.js';

describe('persistence controls', () => {
  it('menyimpan state dan reset ke default dengan status live', () => {
    const state = createGridStateStore();
    state.setSorting([{ selector: 'name', desc: false }]);
    state.setPageSize(40);
    const storage = createMemoryStorage();
    const persistence = createStatePersistence({
      key: 'grid-state',
      state,
      storage,
    });
    const defaults = createGridStateStore().toSnapshot();
    const controls = createPersistenceControls({
      persistence,
      state,
      defaultState: defaults,
    });
    document.body.append(controls.element);

    controls.element
      .querySelector<HTMLButtonElement>('.sui-grid__persistence-save')
      ?.click();
    expect(storage.getItem('grid-state')).toContain('"version":2');
    expect(
      controls.element.querySelector('.sui-grid__persistence-status')
        ?.textContent,
    ).toBe('Pengaturan disimpan.');

    state.setPageSize(10);
    controls.element
      .querySelector<HTMLButtonElement>('.sui-grid__persistence-reset')
      ?.click();
    expect(storage.getItem('grid-state')).toBeNull();
    expect(state.getState().pageSize).toBe(20);
    expect(
      controls.element.querySelector('.sui-grid__persistence-status')
        ?.textContent,
    ).toBe('Pengaturan direset.');

    controls.dispose();
    persistence.dispose();
  });

  it('migrasi snapshot v1 saat load', () => {
    const state = createGridStateStore();
    const storage = createMemoryStorage();
    storage.setItem(
      'legacy',
      JSON.stringify({
        version: 1,
        sortBy: [{ selector: 'name', desc: true }],
        pageSize: 50,
      }),
    );
    const persistence = createStatePersistence({
      key: 'legacy',
      state,
      storage,
    });
    expect(persistence.load()).toBe(true);
    expect(state.getState().sorting).toEqual([
      { selector: 'name', desc: true },
    ]);
    expect(state.getState().pageSize).toBe(50);
    expect(state.getState().expandedGroups).toEqual([]);
    persistence.dispose();
  });
});
