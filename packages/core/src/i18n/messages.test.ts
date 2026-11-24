import { describe, expect, it } from 'vitest';
import { DEFAULT_MESSAGES, formatMessage, resolvePlural } from './messages.js';

describe('formatMessage', () => {
  it('mengganti placeholder dengan nilai parameter', () => {
    expect(
      formatMessage('Halaman {page} dari {pages}', { page: 2, pages: 9 }),
    ).toBe('Halaman 2 dari 9');
  });

  it('membiarkan placeholder yang tidak punya nilai', () => {
    expect(formatMessage('Halo {nama}', {})).toBe('Halo {nama}');
  });

  it('mengubah angka menjadi teks tanpa format tambahan', () => {
    expect(formatMessage('{count} baris', { count: 1234 })).toBe('1234 baris');
  });

  it('mengembalikan teks apa adanya bila tanpa placeholder', () => {
    expect(formatMessage('Tidak ada data')).toBe('Tidak ada data');
  });
});

describe('resolvePlural', () => {
  const rules = new Intl.PluralRules('en');

  it('memilih bentuk one untuk satu', () => {
    expect(resolvePlural({ one: 'satu', other: 'banyak' }, 1, rules)).toBe(
      'satu',
    );
  });

  it('memilih bentuk other untuk selain satu', () => {
    expect(resolvePlural({ one: 'satu', other: 'banyak' }, 5, rules)).toBe(
      'banyak',
    );
  });

  it('memakai bentuk khusus zero bila tersedia', () => {
    expect(
      resolvePlural({ one: 'satu', other: 'banyak', zero: 'kosong' }, 0, rules),
    ).toBe('kosong');
  });
});

describe('DEFAULT_MESSAGES', () => {
  it('memakai key berformat sui.<komponen>.<area>.<key>', () => {
    for (const key of Object.keys(DEFAULT_MESSAGES)) {
      expect(key).toMatch(/^sui\.[a-z]+(\.[a-zA-Z]+)+$/);
    }
  });

  it('katalog bawaan berbahasa Inggris sesuai default locale', () => {
    expect(DEFAULT_MESSAGES['sui.common.empty.noData']).toBe('No data');
  });
});
