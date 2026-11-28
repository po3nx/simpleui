import type { Key, TemplateContext, TemplateRenderer } from '@simpleui/core';

import type { ColumnState } from '../model/columns.js';

/**
 * Kolom seleksi DataGrid (DG-044): checkbox baris + select-all halaman dengan
 * state indeterminate.
 */

export const SELECTION_COLUMN_ID = '__simpleui_selection';

export interface SelectionColumnOptions<T extends object> {
  readonly mode: 'single' | 'multiple';
  readonly getKey: (row: T) => Key;
  readonly isSelected: (key: Key) => boolean;
  readonly getVisibleKeys: () => readonly Key[];
  readonly getSelectedKeys: () => readonly Key[];
  readonly onToggle: (key: Key, shiftKey: boolean) => void;
  readonly onToggleAll?: ((select: boolean) => void) | undefined;
}

function keyOf<T extends object>(
  context: TemplateContext<unknown>,
  getKey: (row: T) => Key,
): Key {
  return getKey(context.data as T);
}

function createCheckbox(label: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'sui-grid__select';
  input.setAttribute('aria-label', label);
  return input;
}

function cellTemplate<T extends object>(
  options: SelectionColumnOptions<T>,
): TemplateRenderer {
  return (container, context) => {
    const input = createCheckbox('Pilih baris');
    container.append(input);
    let current = context;

    const update = (): void => {
      input.checked = options.isSelected(keyOf(current, options.getKey));
    };
    const onChange = (event: Event): void => {
      options.onToggle(
        keyOf(current, options.getKey),
        (event as MouseEvent).shiftKey === true,
      );
    };

    input.addEventListener('click', onChange);
    update();
    return {
      update(next) {
        current = next;
        update();
      },
      dispose() {
        input.removeEventListener('change', onChange);
        input.remove();
      },
    };
  };
}

function headerTemplate<T extends object>(
  options: SelectionColumnOptions<T>,
): TemplateRenderer {
  return (container) => {
    const input = createCheckbox('Pilih semua baris');
    container.append(input);

    const update = (): void => {
      const visible = options.getVisibleKeys();
      const selected = options.getSelectedKeys();
      const selectedVisible = visible.filter((key) => selected.includes(key));
      input.checked =
        visible.length > 0 && selectedVisible.length === visible.length;
      input.indeterminate =
        selectedVisible.length > 0 && selectedVisible.length < visible.length;
    };
    const onChange = (): void => {
      const visible = options.getVisibleKeys();
      const selected = options.getSelectedKeys();
      const all =
        visible.length > 0 && visible.every((key) => selected.includes(key));
      options.onToggleAll?.(!all);
    };

    input.addEventListener('click', onChange);
    update();
    return {
      update,
      dispose() {
        input.removeEventListener('change', onChange);
        input.remove();
      },
    };
  };
}

export function createSelectionColumn<T extends object>(
  options: SelectionColumnOptions<T>,
): ColumnState<T> {
  return {
    id: SELECTION_COLUMN_ID,
    dataField: undefined,
    caption: 'Pilih',
    dataType: 'boolean',
    width: 44,
    minWidth: 44,
    maxWidth: 44,
    alignment: 'center',
    fixed: 'start',
    visible: true,
    allowSorting: false,
    allowFiltering: false,
    allowEditing: false,
    allowResizing: false,
    allowReordering: false,
    allowHiding: false,
    format: undefined,
    cellTemplate: cellTemplate(options),
    headerCellTemplate:
      options.mode === 'multiple' ? headerTemplate(options) : undefined,
    calculateCellValue: undefined,
    lookup: undefined,
    bandId: undefined,
    depth: 0,
    children: undefined,
  };
}
