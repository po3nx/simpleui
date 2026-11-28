import { describe, expect, it } from 'vitest';
import {
  createValidationEngine,
  email,
  minLength,
  numberRange,
  pattern,
  required,
  type Validator,
} from './validation.js';

interface Row {
  id: number;
  name: string;
  email: string;
  total: number;
}

const ROW: Row = { id: 1, name: '', email: 'x', total: 5 };

describe('validator bawaan', () => {
  it('required/minLength/pattern/email/numberRange', async () => {
    const engine = createValidationEngine<Row>({
      fields: {
        name: [required(), minLength(3)],
        email: [email()],
        total: [numberRange(10, 20)],
      },
    });
    const errors = await engine.validate(
      { name: '', email: 'bukan-email', total: 5 },
      ROW,
    );
    expect(errors).toEqual({
      name: 'Wajib diisi.',
      email: 'Email tidak valid.',
      total: 'Harus antara 10 dan 20.',
    });
    expect(pattern(/^A/, 'Harus A')('B', {}, { field: 'x' })).toBe('Harus A');
  });

  it('validasi field tunggal', async () => {
    const engine = createValidationEngine<Row>({
      fields: { name: required('Nama wajib.') },
    });
    await expect(engine.validateField('name', { name: '' }, ROW)).resolves.toBe(
      'Nama wajib.',
    );
    await expect(
      engine.validateField('email', { email: 'x' }, ROW),
    ).resolves.toBeUndefined();
  });
});

describe('validasi async dan lintas field', () => {
  it('menggabungkan error field async dan form', async () => {
    const asyncCheck: Validator<Row> = async (value) => {
      await Promise.resolve();
      return value === 'budil' ? 'Nama sudah dipakai.' : undefined;
    };
    const engine = createValidationEngine<Row>({
      fields: { name: asyncCheck },
      form: (values) =>
        values.email === values.name
          ? { email: 'Email tidak boleh sama dengan nama.' }
          : {},
    });
    const errors = await engine.validate(
      { name: 'budil', email: 'budil' },
      ROW,
    );
    expect(errors).toEqual({
      name: 'Nama sudah dipakai.',
      email: 'Email tidak boleh sama dengan nama.',
    });
  });

  it('menghormati AbortSignal', async () => {
    const controller = new AbortController();
    const slow: Validator<Row> = async () => {
      controller.abort();
      return 'x';
    };
    const engine = createValidationEngine<Row>({ fields: { name: slow } });
    await expect(
      engine.validate({ name: 'a' }, ROW, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
