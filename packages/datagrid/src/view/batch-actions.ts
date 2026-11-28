import { createElement } from '@simpleui/core';

import type { EditingModel } from '../data/editing-model.js';

/**
 * Toolbar batch edit (DG-063): jumlah perubahan, simpan semua, batalkan semua,
 * dengan status live untuk screen reader.
 */

export interface BatchActionsLabels {
  readonly save?: string;
  readonly reset?: string;
  readonly saved?: string;
  readonly resetDone?: string;
  readonly failed?: string;
  readonly pending?: (count: number) => string;
}

export interface BatchActionsOptions<T extends object> {
  readonly model: EditingModel<T>;
  readonly labels?: BatchActionsLabels;
}

export interface BatchActions {
  readonly element: HTMLElement;
  dispose(): void;
}

export function createBatchActions<T extends object>(
  options: BatchActionsOptions<T>,
): BatchActions {
  const labels = options.labels ?? {};
  const element = createElement('div', {
    className: 'sui-grid__batch-actions',
  });
  const status = createElement('span', {
    className: 'sui-grid__batch-status',
  });
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const save = createElement('button', {
    className: 'sui-grid__batch-save',
    text: labels.save ?? 'Simpan semua',
  });
  save.type = 'button';
  const reset = createElement('button', {
    className: 'sui-grid__batch-reset',
    text: labels.reset ?? 'Batalkan perubahan',
  });
  reset.type = 'button';

  const render = (): void => {
    const count = options.model.getDirtyKeys().length;
    save.disabled = count === 0;
    reset.disabled = count === 0;
    status.textContent =
      count === 0
        ? ''
        : (labels.pending?.(count) ?? `${count} perubahan belum disimpan.`);
  };

  const onSave = async (): Promise<void> => {
    const saved = await options.model.save();
    render();
    status.textContent = saved
      ? (labels.saved ?? 'Perubahan disimpan.')
      : (labels.failed ?? 'Perubahan gagal disimpan.');
  };
  const onReset = (): void => {
    options.model.revertAll();
    render();
    status.textContent = labels.resetDone ?? 'Perubahan dibatalkan.';
  };
  element.append(status, reset, save);
  save.addEventListener('click', onSave);
  reset.addEventListener('click', onReset);
  const unsubscribe = options.model.subscribe(render);
  render();

  return {
    element,
    dispose() {
      unsubscribe();
      save.removeEventListener('click', onSave);
      reset.removeEventListener('click', onReset);
      element.remove();
    },
  };
}
