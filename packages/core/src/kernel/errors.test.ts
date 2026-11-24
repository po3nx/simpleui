import { describe, expect, it } from 'vitest';
import { SimpleUIError, isSimpleUIError } from './errors.js';

describe('SimpleUIError', () => {
  it('menyertakan kode pada nama dan pesan', () => {
    const error = new SimpleUIError('SUI-CORE-002', 'sudah dibuang');

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('SUI-CORE-002');
    expect(error.message).toBe('[SUI-CORE-002] sudah dibuang');
    expect(error.name).toBe('SimpleUIError');
  });

  it('meneruskan opsi cause', () => {
    const cause = new Error('asal');
    const error = new SimpleUIError('SUI-CORE-001', 'invalid', { cause });

    expect(error.cause).toBe(cause);
  });
});

describe('isSimpleUIError', () => {
  it('mengenali error library', () => {
    expect(isSimpleUIError(new SimpleUIError('SUI-CORE-003', 'x'))).toBe(true);
  });

  it('menolak error lain dan nilai non-error', () => {
    expect(isSimpleUIError(new Error('biasa'))).toBe(false);
    expect(isSimpleUIError('SUI-CORE-003')).toBe(false);
    expect(isSimpleUIError(null)).toBe(false);
  });
});
