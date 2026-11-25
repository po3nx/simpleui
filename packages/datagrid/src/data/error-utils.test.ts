import { DataError } from '@simpleui/core';
import { describe, expect, it } from 'vitest';
import { DataGridError } from '../errors.js';
import {
  classifyError,
  DEFAULT_ERROR_MESSAGES,
  describeGridError,
  isAbortError,
  isRetryable,
  toGridError,
} from './error-utils.js';

describe('classifyError', () => {
  it('meneruskan kode DataGridError', () => {
    const error = new DataGridError('SUI-DG-009', 'tidak didukung');
    expect(classifyError(error)).toEqual({
      code: 'SUI-DG-009',
      cause: undefined,
    });
  });

  it('memetakan DataError menjadi 004 atau 005', () => {
    expect(classifyError(new DataError('SUI-DATA-002', 'jaringan')).code).toBe(
      'SUI-DG-004',
    );

    const conflict = Object.assign(new DataError('SUI-DATA-002', 'konflik'), {
      status: 409,
    });
    expect(classifyError(conflict).code).toBe('SUI-DG-005');
  });

  it('memetakan error 409 generik dan error tak dikenal', () => {
    expect(classifyError({ status: 409 }).code).toBe('SUI-DG-005');
    expect(classifyError(new Error('boom')).code).toBe('SUI-DG-004');
    expect(classifyError('string error').code).toBe('SUI-DG-004');
  });
});

describe('toGridError', () => {
  it('mengembalikan instance yang sama untuk DataGridError', () => {
    const error = new DataGridError('SUI-DG-006', 'template');
    expect(toGridError(error)).toBe(error);
  });

  it('membungkus error asing dengan pesan aman', () => {
    const wrapped = toGridError(new Error('detail internal rahasia'));

    expect(wrapped).toBeInstanceOf(DataGridError);
    expect(wrapped.code).toBe('SUI-DG-004');
    expect(wrapped.message).not.toContain('rahasia');
    expect(wrapped.cause).toBeInstanceOf(Error);
  });
});

describe('describeGridError', () => {
  it('memberi pesan default dan retryable per kode', () => {
    expect(describeGridError(new Error('x'))).toMatchObject({
      code: 'SUI-DG-004',
      message: DEFAULT_ERROR_MESSAGES['SUI-DG-004'],
      retryable: true,
    });

    expect(
      describeGridError(new DataGridError('SUI-DG-005', 'konflik')),
    ).toMatchObject({ code: 'SUI-DG-005', retryable: false });
  });

  it('menghormati pesan override tanpa membocorkan detail internal', () => {
    const info = describeGridError(new Error('detail internal'), {
      'SUI-DG-004': 'Koneksi bermasalah.',
    });

    expect(info.message).toBe('Koneksi bermasalah.');
    expect(info.message).not.toContain('detail internal');
  });
});

describe('abort dan retryable', () => {
  it('mengenali AbortError', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
    expect(isAbortError(new Error('lain'))).toBe(false);
  });

  it('hanya 004 dan 007 yang retryable', () => {
    expect(isRetryable(new DataGridError('SUI-DG-004', 'load'))).toBe(true);
    expect(isRetryable(new DataGridError('SUI-DG-005', 'konflik'))).toBe(false);
    expect(isRetryable(new DataGridError('SUI-DG-007', 'export'))).toBe(true);
  });
});
