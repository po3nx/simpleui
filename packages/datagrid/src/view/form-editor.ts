import type { Key } from '@simpleui/core';

import type { ColumnState } from '../model/columns.js';
import type { ValidationErrors } from '../data/validation.js';

/**
 * Popup/form editor DataGrid (DG-062): dialog modal, field dari kolom,
 * validasi sync, focus trap, Escape/cancel, dan pengembalian fokus.
 */

export interface FormEditorLabels {
  readonly title?: string;
  readonly save?: string;
  readonly cancel?: string;
  readonly invalid?: string;
}

export interface FormEditorOptions<T extends object> {
  readonly row: T;
  readonly rowKey: Key;
  readonly columns: readonly ColumnState<T>[];
  readonly labels?: FormEditorLabels;
  readonly validate?: (
    values: Partial<T>,
    row: T,
  ) => ValidationErrors | Promise<ValidationErrors>;
  readonly onSave?: (values: Partial<T>, row: T) => unknown | Promise<unknown>;
  readonly onCancel?: (row: T) => void;
  readonly onClose?: () => void;
  readonly returnFocus?: HTMLElement | null;
}

export interface FormEditor {
  readonly element: HTMLElement;
  readonly dialog: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  dispose(): void;
}

interface Field<T extends object> {
  readonly column: ColumnState<T>;
  readonly input: HTMLInputElement;
  readonly error: HTMLElement;
}

function inputForColumn<T extends object>(
  column: ColumnState<T>,
  value: unknown,
): HTMLInputElement {
  const input = document.createElement('input');
  input.type =
    column.dataType === 'number'
      ? 'number'
      : column.dataType === 'date'
        ? 'date'
        : column.dataType === 'boolean'
          ? 'checkbox'
          : 'text';
  if (column.dataType === 'boolean') input.checked = value === true;
  else if (value !== null && value !== undefined) input.value = String(value);
  input.id = `sui-form-${column.id}`;
  input.name = column.dataField ?? column.id;
  return input;
}

function collect<T extends object>(fields: readonly Field<T>[]): Partial<T> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    values[field.column.dataField ?? field.column.id] =
      field.input.type === 'checkbox'
        ? field.input.checked
        : field.input.type === 'number'
          ? field.input.value === ''
            ? null
            : Number(field.input.value)
          : field.input.value;
  }
  return values as Partial<T>;
}

class FormEditorImpl<T extends object> implements FormEditor {
  readonly element: HTMLElement;
  readonly dialog: HTMLElement;
  readonly #options: FormEditorOptions<T>;
  readonly #fields: Field<T>[] = [];
  readonly #title: HTMLElement;
  readonly #errorSummary: HTMLElement;
  #saveButton: HTMLButtonElement | null = null;
  #open = false;
  #busy = false;

  constructor(options: FormEditorOptions<T>) {
    this.#options = options;
    this.element = document.createElement('div');
    this.element.className = 'sui-grid__form-overlay';
    this.element.hidden = true;
    this.dialog = document.createElement('div');
    this.dialog.className = 'sui-grid__form-dialog';
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-modal', 'true');
    this.dialog.setAttribute('aria-labelledby', 'sui-form-title');
    this.dialog.tabIndex = -1;

    this.#title = document.createElement('h2');
    this.#title.id = 'sui-form-title';
    this.#title.className = 'sui-grid__form-title';
    this.#title.textContent = options.labels?.title ?? 'Edit baris';
    this.#errorSummary = document.createElement('p');
    this.#errorSummary.className = 'sui-grid__form-error-summary';
    this.#errorSummary.setAttribute('role', 'alert');
    this.#errorSummary.hidden = true;

    const form = document.createElement('form');
    form.className = 'sui-grid__form';
    form.noValidate = true;
    form.append(this.#title, this.#errorSummary);
    for (const column of options.columns) {
      if (
        !column.allowEditing ||
        column.cellTemplate ||
        (!column.dataField && !column.calculateCellValue)
      ) {
        continue;
      }
      const field = this.#createField(column);
      this.#fields.push(field);
      form.append(field.input.closest('label') as HTMLElement, field.error);
    }
    form.append(this.#createActions());
    form.addEventListener('submit', this.#onSubmit);
    this.dialog.append(form);
    this.dialog.addEventListener('keydown', this.#onKeyDown);
    this.element.append(this.dialog);
    this.element.addEventListener('pointerdown', (event) => {
      if (event.target === this.element) this.close();
    });
  }

  #createField(column: ColumnState<T>): Field<T> {
    const value = column.calculateCellValue
      ? column.calculateCellValue(this.#options.row)
      : (this.#options.row as Record<string, unknown>)[
          column.dataField ?? column.id
        ];
    const input = inputForColumn(column, value);
    const label = document.createElement('label');
    label.className = 'sui-grid__form-field';
    label.htmlFor = input.id;
    label.append(document.createTextNode(column.caption), input);
    const error = document.createElement('p');
    error.className = 'sui-grid__form-error';
    error.id = `${input.id}-error`;
    error.hidden = true;
    return { column, input, error };
  }

  #createActions(): HTMLElement {
    const actions = document.createElement('div');
    actions.className = 'sui-grid__form-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'sui-grid__form-cancel';
    cancel.textContent = this.#options.labels?.cancel ?? 'Batal';
    cancel.addEventListener('click', () => this.close());
    const save = document.createElement('button');
    save.type = 'submit';
    save.className = 'sui-grid__form-save';
    save.textContent = this.#options.labels?.save ?? 'Simpan';
    this.#saveButton = save;
    actions.append(cancel, save);
    return actions;
  }

  readonly #onSubmit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    if (this.#busy) return;
    const values = collect(this.#fields);
    this.#setBusy(true);
    try {
      const errors =
        (await this.#options.validate?.(values, this.#options.row)) ?? {};
      this.#showErrors(errors);
      if (Object.keys(errors).length > 0) return;
      if ((await this.#options.onSave?.(values, this.#options.row)) === false) {
        return;
      }
      this.#close(false);
    } catch {
      this.#errorSummary.hidden = false;
      this.#errorSummary.textContent = 'Gagal menyimpan perubahan.';
    } finally {
      this.#setBusy(false);
    }
  };

  #setBusy(busy: boolean): void {
    this.#busy = busy;
    this.dialog.setAttribute('aria-busy', String(busy));
    if (this.#saveButton) this.#saveButton.disabled = busy;
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = this.#focusables();
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  #focusables(): HTMLElement[] {
    return [
      ...this.dialog.querySelectorAll<HTMLElement>(
        'input, button, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => !element.hidden);
  }

  #showErrors(errors: Readonly<Record<string, string>>): void {
    this.#errorSummary.hidden = Object.keys(errors).length === 0;
    this.#errorSummary.textContent = this.#errorSummary.hidden
      ? ''
      : (this.#options.labels?.invalid ??
        'Periksa kembali isian yang ditandai.');
    for (const field of this.#fields) {
      const message = errors[field.column.dataField ?? field.column.id];
      field.error.hidden = message === undefined;
      field.error.textContent = message ?? '';
      if (message === undefined) {
        field.input.removeAttribute('aria-invalid');
        field.input.removeAttribute('aria-describedby');
      } else {
        field.input.setAttribute('aria-invalid', 'true');
        field.input.setAttribute('aria-describedby', field.error.id);
      }
    }
  }

  open(): void {
    if (this.#open) return;
    this.#open = true;
    this.element.hidden = false;
    document.body.append(this.element);
    this.dialog.focus();
    this.#fields[0]?.input.focus();
  }

  close(): void {
    this.#close(true);
  }

  #close(cancelled: boolean): void {
    if (!this.#open) return;
    this.#open = false;
    this.element.hidden = true;
    this.element.remove();
    if (cancelled) this.#options.onCancel?.(this.#options.row);
    this.#options.onClose?.();
    this.#options.returnFocus?.focus({ preventScroll: true });
  }

  isOpen(): boolean {
    return this.#open;
  }

  dispose(): void {
    if (this.#open) {
      this.#open = false;
      this.element.remove();
      this.#options.returnFocus?.focus({ preventScroll: true });
    }
    this.#options.onClose?.();
  }
}

export function createFormEditor<T extends object>(
  options: FormEditorOptions<T>,
): FormEditor {
  return new FormEditorImpl(options);
}
