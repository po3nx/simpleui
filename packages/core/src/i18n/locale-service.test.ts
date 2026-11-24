import { describe, expect, it, vi } from 'vitest';
import { SimpleUIError } from '../kernel/errors.js';
import { createLocaleService, resolveLocale } from './locale-service.js';

const COLUMN_DATE = new Date(Date.UTC(2026, 10, 24));

describe('resolveLocale', () => {
  it('memakai locale pertama yang valid dan mengkanonikalisasinya', () => {
    expect(resolveLocale(['en-us'])).toBe('en-US');
    expect(resolveLocale(['id-ID', 'en'])).toBe('id-ID');
  });

  it('melewati locale tidak valid lalu memakai fallback', () => {
    expect(resolveLocale(['bukan-locale!', 'id-ID'])).toBe('id-ID');
  });

  it('kembali ke en bila semua kandidat tidak valid', () => {
    expect(resolveLocale([undefined, '???'])).toBe('en');
  });
});

describe('createLocaleService', () => {
  it('memakai default en, USD, dan arah ltr', () => {
    const locale = createLocaleService();

    expect(locale.locale).toBe('en');
    expect(locale.currency).toBe('USD');
    expect(locale.direction).toBe('ltr');
    expect(locale.timeZone).toBeUndefined();
  });

  it('menetapkan arah rtl untuk locale RTL', () => {
    expect(createLocaleService({ locale: 'ar-EG' }).direction).toBe('rtl');
  });

  it('mengembalikan pesan bawaan', () => {
    expect(createLocaleService().t('sui.common.loading')).toBe('Loading…');
  });

  it('menimpa pesan lewat opsi messages', () => {
    const locale = createLocaleService({
      locale: 'id-ID',
      messages: { 'sui.common.loading': 'Memuat…' },
    });

    expect(locale.t('sui.common.loading')).toBe('Memuat…');
  });

  it('mengembalikan key bila pesan tidak ada', () => {
    expect(createLocaleService().t('sui.tidak.ada')).toBe('sui.tidak.ada');
  });

  it('memakai bentuk plural sesuai jumlah', () => {
    const locale = createLocaleService({ locale: 'en-US' });

    expect(locale.t('sui.common.selection.selected', { count: 1 })).toBe(
      '1 row selected',
    );
    expect(locale.t('sui.common.selection.selected', { count: 5 })).toBe(
      '5 rows selected',
    );
    expect(locale.t('sui.common.selection.selected', { count: 0 })).toBe(
      'No rows selected',
    );
  });

  it('mengisi placeholder pada pesan', () => {
    const locale = createLocaleService();

    expect(locale.t('sui.common.pager.pageOf', { page: 2, pages: 7 })).toBe(
      'Page 2 of 7',
    );
  });

  it('mengubah teks pada pseudo-locale en-XA', () => {
    const plain = createLocaleService();
    const pseudo = createLocaleService({ locale: 'en-XA' });

    const original = plain.t('sui.common.empty.noData');
    const localized = pseudo.t('sui.common.empty.noData');

    expect(localized).not.toBe(original);
    expect(localized.length).toBeGreaterThan(original.length);
  });

  it('memformat angka sesuai locale', () => {
    expect(createLocaleService({ locale: 'en-US' }).formatNumber(1234.5)).toBe(
      '1,234.5',
    );
    expect(createLocaleService({ locale: 'de-DE' }).formatNumber(1234.5)).toBe(
      '1.234,5',
    );
  });

  it('memformat persen dan mata uang', () => {
    const locale = createLocaleService({ locale: 'en-US' });

    expect(locale.formatPercent(0.25)).toBe('25%');
    expect(locale.formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('memakai timeZone eksplisit untuk tanggal', () => {
    const locale = createLocaleService({ locale: 'en-US', timeZone: 'UTC' });

    expect(
      locale.formatDate(COLUMN_DATE, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    ).toBe('11/24/2026');
  });

  it('menolak mata uang tidak valid dengan SUI-I18N-001', () => {
    expect(() => createLocaleService({ currency: 'BUKAN' })).toThrowError(
      SimpleUIError,
    );

    try {
      createLocaleService({ currency: 'BUKAN' });
    } catch (error) {
      expect((error as SimpleUIError).code).toBe('SUI-I18N-001');
    }
  });

  it('meng-cache formatter sehingga Intl tidak dibuat berulang', () => {
    const spy = vi.spyOn(Intl, 'NumberFormat');
    const locale = createLocaleService({ locale: 'en-US' });
    const afterConstruction = spy.mock.calls.length;

    locale.formatNumber(1);
    locale.formatNumber(2);
    locale.formatNumber(3);

    expect(spy.mock.calls.length).toBe(afterConstruction + 1);
    spy.mockRestore();
  });
});
