import { describe, expect, it } from 'vitest';
import {
  getDirection,
  isPseudoLocale,
  isRtlLocale,
  pseudoLocalize,
} from './locale.js';

describe('isRtlLocale / getDirection', () => {
  it('mengenali bahasa RTL beserta region', () => {
    for (const locale of ['ar', 'ar-EG', 'he', 'fa-IR', 'ur-PK']) {
      expect(isRtlLocale(locale)).toBe(true);
    }
  });

  it('menganggap bahasa lain LTR', () => {
    for (const locale of ['en', 'en-US', 'id-ID', 'de']) {
      expect(isRtlLocale(locale)).toBe(false);
    }
  });

  it('tidak peka huruf besar/kecil', () => {
    expect(isRtlLocale('AR-eg')).toBe(true);
  });

  it('mengembalikan arah teks', () => {
    expect(getDirection('ar')).toBe('rtl');
    expect(getDirection('id-ID')).toBe('ltr');
  });
});

describe('pseudoLocalize', () => {
  it('memberi aksen dan memperpanjang teks sekitar 30%', () => {
    const source = 'No data';
    const result = pseudoLocalize(source);

    expect(result).not.toBe(source);
    expect(result.length).toBeGreaterThan(source.length);
    expect(result).toContain('·');
    expect(result.startsWith('Ñ')).toBe(true);
  });

  it('tidak mengubah karakter di luar peta aksen', () => {
    expect(pseudoLocalize('1 2')).toContain('1 2');
  });

  it('mengenali locale pseudo en-XA', () => {
    expect(isPseudoLocale('en-XA')).toBe(true);
    expect(isPseudoLocale('en-xa')).toBe(true);
    expect(isPseudoLocale('en-US')).toBe(false);
  });
});
