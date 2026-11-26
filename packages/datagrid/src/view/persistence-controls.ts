import { createElement } from '@simpleui/core';

import type { DataGridStateSnapshot } from '../api/types.js';
import type { GridStateStore } from '../model/state.js';
import type { StatePersistence } from '../data/persistence.js';

/**
 * Kontrol UI state persistence (DG-075): tombol simpan/reset + live status.
 * Elemen dikembalikan agar consumer menempatkannya di toolbar sendiri.
 */

export interface PersistenceControlsLabels {
  readonly group?: string;
  readonly save?: string;
  readonly reset?: string;
  readonly saved?: string;
  readonly resetDone?: string;
}

export interface PersistenceControlsOptions {
  readonly persistence: StatePersistence;
  readonly state?: GridStateStore;
  readonly defaultState?: DataGridStateSnapshot;
  readonly labels?: PersistenceControlsLabels;
}

export interface PersistenceControls {
  readonly element: HTMLElement;
  dispose(): void;
}

export function createPersistenceControls(
  options: PersistenceControlsOptions,
): PersistenceControls {
  const labels = options.labels ?? {};
  const element = createElement('div', { className: 'sui-grid__persistence' });
  element.setAttribute('role', 'group');
  element.setAttribute('aria-label', labels.group ?? 'Penyimpanan pengaturan');

  const save = createElement('button', {
    className: 'sui-grid__persistence-save',
    text: labels.save ?? 'Simpan pengaturan',
  });
  save.setAttribute('type', 'button');
  const reset = createElement('button', {
    className: 'sui-grid__persistence-reset',
    text: labels.reset ?? 'Reset pengaturan',
  });
  reset.setAttribute('type', 'button');
  const status = createElement('span', {
    className: 'sui-grid__persistence-status',
  });
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const announce = (message: string): void => {
    status.textContent = message;
  };
  const onSave = (): void => {
    options.persistence.save();
    announce(labels.saved ?? 'Pengaturan disimpan.');
  };
  const onReset = (): void => {
    options.persistence.clear();
    if (options.state && options.defaultState) {
      options.state.restore(options.defaultState);
    }
    announce(labels.resetDone ?? 'Pengaturan direset.');
  };
  save.addEventListener('click', onSave);
  reset.addEventListener('click', onReset);
  element.append(save, reset, status);

  return {
    element,
    dispose() {
      save.removeEventListener('click', onSave);
      reset.removeEventListener('click', onReset);
      element.remove();
    },
  };
}
