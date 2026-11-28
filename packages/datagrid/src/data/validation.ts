import type { Key } from '@simpleui/core';

/**
 * Validation engine DataGrid (DG-064): aturan per kolom sync/async, validasi
 * lintas field, agregasi error, dan abort. Pesan dipakai form/editor untuk
 * aria-invalid + role="alert".
 */

export type ValidationErrors = Readonly<Record<string, string>>;

export interface ValidationContext {
  readonly field: string;
  readonly signal?: AbortSignal | undefined;
}

export type Validator<T extends object> = (
  value: unknown,
  values: Partial<T>,
  context: ValidationContext,
) => string | null | undefined | Promise<string | null | undefined>;

export interface ValidationEngineOptions<T extends object> {
  readonly fields?:
    | Readonly<Record<string, Validator<T> | readonly Validator<T>[]>>
    | undefined;
  readonly form?:
    | ((
        values: Partial<T>,
        row: T,
        signal?: AbortSignal,
      ) => ValidationErrors | Promise<ValidationErrors>)
    | undefined;
}

export interface ValidationEngine<T extends object> {
  validate(
    values: Partial<T>,
    row: T,
    signal?: AbortSignal,
  ): Promise<ValidationErrors>;
  validateField(
    field: string,
    values: Partial<T>,
    row: T,
    signal?: AbortSignal,
  ): Promise<string | undefined>;
}

function assertAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Validasi dibatalkan.', 'AbortError');
  }
}

export async function runValidators<T extends object>(
  field: string,
  validators: readonly Validator<T>[],
  values: Partial<T>,
  context: ValidationContext,
): Promise<string | undefined> {
  for (const validator of validators) {
    assertAborted(context.signal);
    const message = await validator(
      (values as Record<string, unknown>)[field],
      values,
      context,
    );
    if (message) return message;
  }
  return undefined;
}

class ValidationEngineImpl<T extends object> implements ValidationEngine<T> {
  readonly #options: ValidationEngineOptions<T>;

  constructor(options: ValidationEngineOptions<T>) {
    this.#options = options;
  }

  async validateField(
    field: string,
    values: Partial<T>,
    row: T,
    signal?: AbortSignal,
  ): Promise<string | undefined> {
    void row;
    const configured = this.#options.fields?.[field];
    if (!configured) return undefined;
    const validators = Array.isArray(configured) ? configured : [configured];
    return runValidators(field, validators as Validator<T>[], values, {
      field,
      signal,
    });
  }

  async validate(
    values: Partial<T>,
    row: T,
    signal?: AbortSignal,
  ): Promise<ValidationErrors> {
    const fields = Object.keys(this.#options.fields ?? {});
    const results = await Promise.all(
      fields.map(async (field) => ({
        field,
        message: await this.validateField(field, values, row, signal),
      })),
    );
    assertAborted(signal);
    const errors: Record<string, string> = {};
    for (const result of results) {
      if (result.message) errors[result.field] = result.message;
    }
    if (this.#options.form) {
      Object.assign(errors, await this.#options.form(values, row, signal));
    }
    return errors;
  }
}

export function createValidationEngine<T extends object>(
  options: ValidationEngineOptions<T> = {},
): ValidationEngine<T> {
  return new ValidationEngineImpl(options);
}

export function required<T extends object>(
  message = 'Wajib diisi.',
): Validator<T> {
  return (value) =>
    value === null || value === undefined || value === '' ? message : undefined;
}

export function minLength<T extends object>(
  length: number,
  message = `Minimal ${length} karakter.`,
): Validator<T> {
  return (value) =>
    typeof value === 'string' && value.length < length ? message : undefined;
}

export function pattern<T extends object>(
  regex: RegExp,
  message = 'Format tidak valid.',
): Validator<T> {
  return (value) =>
    typeof value === 'string' && !regex.test(value) ? message : undefined;
}

export function email<T extends object>(
  message = 'Email tidak valid.',
): Validator<T> {
  return pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);
}

export function numberRange<T extends object>(
  min: number,
  max: number,
  message = `Harus antara ${min} dan ${max}.`,
): Validator<T> {
  return (value) => {
    if (value === null || value === undefined || value === '') return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= min && numeric <= max
      ? undefined
      : message;
  };
}

export type ValidationErrorsByKey = ReadonlyMap<Key, ValidationErrors>;
