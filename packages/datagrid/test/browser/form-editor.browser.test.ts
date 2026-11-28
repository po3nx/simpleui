import { describe, expect, it, vi } from 'vitest';
import '../../src/styles/grid.css';
import { normalizeColumnModel } from '../../src/model/columns.js';
import { createFormEditor } from '../../src/view/form-editor.js';
import { createGridView } from '../../src/view/grid-view.js';
import { createRowRenderer } from '../../src/view/row-renderer.js';

interface Row {
  id: number;
  name: string;
  total: number;
  active: boolean;
}

const COLUMNS = normalizeColumnModel<Row>([
  { dataField: 'name', caption: 'Nama', width: 140 },
  { dataField: 'total', caption: 'Total', width: 100, dataType: 'number' },
  { dataField: 'active', caption: 'Aktif', width: 80, dataType: 'boolean' },
]);
const ROW: Row = { id: 1, name: 'Ani', total: 10, active: true };

function openForm(
  overrides: Partial<Parameters<typeof createFormEditor<Row>>[0]> = {},
) {
  const trigger = document.createElement('button');
  trigger.textContent = 'Edit';
  document.body.append(trigger);
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const editor = createFormEditor<Row>({
    row: ROW,
    rowKey: 1,
    columns: COLUMNS,
    returnFocus: trigger,
    onSave,
    onCancel,
    ...overrides,
  });
  editor.open();
  return { trigger, editor, onSave, onCancel };
}

describe('form editor — dialog dan fokus', () => {
  it('membuka dialog modal dengan field dan fokus pertama', () => {
    const { editor, trigger } = openForm();
    expect(editor.dialog.getAttribute('role')).toBe('dialog');
    expect(editor.dialog.getAttribute('aria-modal')).toBe('true');
    expect(editor.dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement?.getAttribute('name')).toBe('name');

    editor.close();
    expect(document.activeElement).toBe(trigger);
    editor.dispose();
    trigger.remove();
  });

  it('Tab dan Shift+Tab terperangkap di dialog', () => {
    const { editor } = openForm();
    const focusables = [
      ...editor.dialog.querySelectorAll<HTMLElement>('input, button'),
    ];
    const first = focusables[0] as HTMLElement;
    const last = focusables[focusables.length - 1] as HTMLElement;

    last.focus();
    last.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(document.activeElement).toBe(last);

    editor.close();
    editor.dispose();
  });
});

describe('form editor — validasi dan simpan', () => {
  it('menolak simpan dan menandai field invalid', () => {
    const onSave = vi.fn();
    const { editor } = openForm({
      onSave,
      validate: (values) =>
        values.name ? undefined : { name: 'Nama wajib diisi.' },
    });
    const name =
      editor.dialog.querySelector<HTMLInputElement>('input[name="name"]');
    if (!name) throw new Error('input name tidak ada');
    name.value = '';
    editor.dialog
      .querySelector<HTMLButtonElement>('.sui-grid__form-save')
      ?.click();

    expect(onSave).not.toHaveBeenCalled();
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toContain('name-error');
    expect(
      editor.dialog.querySelector('.sui-grid__form-error')?.textContent,
    ).toContain('Nama wajib');
    editor.close();
    editor.dispose();
  });

  it('menyimpan nilai bertipe dan menutup tanpa onCancel', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const { editor, trigger } = openForm({ onSave, onCancel });
    const name =
      editor.dialog.querySelector<HTMLInputElement>('input[name="name"]');
    const total = editor.dialog.querySelector<HTMLInputElement>(
      'input[name="total"]',
    );
    const active = editor.dialog.querySelector<HTMLInputElement>(
      'input[name="active"]',
    );
    if (!name || !total || !active) throw new Error('field tidak lengkap');
    name.value = 'Budi';
    total.value = '42';
    active.checked = false;

    editor.dialog
      .querySelector<HTMLButtonElement>('.sui-grid__form-save')
      ?.click();

    expect(onSave).toHaveBeenCalledWith(
      { name: 'Budi', total: 42, active: false },
      ROW,
    );
    expect(onCancel).not.toHaveBeenCalled();
    expect(editor.isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger);
    editor.dispose();
  });

  it('Escape membatalkan dan mengembalikan fokus', () => {
    const onCancel = vi.fn();
    const { editor, trigger } = openForm({ onCancel });
    editor.dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(onCancel).toHaveBeenCalledWith(ROW);
    expect(document.activeElement).toBe(trigger);
    editor.dispose();
  });
});

describe('form editor — integrasi row renderer', () => {
  it('mode form memanggil onFormRequest saat sel diaktifkan', () => {
    const container = document.createElement('div');
    container.style.width = '500px';
    container.style.height = '200px';
    document.body.append(container);
    const onFormRequest = vi.fn();
    const grid = createGridView<Row>({
      container,
      columns: COLUMNS,
      rowCount: 1,
      rowHeight: 40,
    });
    const renderer = createRowRenderer<Row>({
      gridElement: grid.element,
      viewportElement: grid.viewportElement,
      spacerElement: grid.spacerElement,
      rowsElement: grid.rowsElement,
      columns: COLUMNS,
      rows: [ROW],
      keyOf: (row) => row.id,
      editing: { mode: 'form', onFormRequest },
    });
    grid.rowsElement
      .querySelector<HTMLElement>('[data-column-id="name"]')
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(onFormRequest).toHaveBeenCalledWith(ROW, 1);

    renderer.dispose();
    grid.dispose();
    container.remove();
  });
});
