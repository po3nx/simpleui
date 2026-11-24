import { describe, expect, it } from 'vitest';
import { NAV_SECTIONS } from './nav.js';
import { findPage, resolveSlug } from './router.js';

describe('resolveSlug', () => {
  it('mengambil slug dari hash', () => {
    expect(resolveSlug('#/tema', NAV_SECTIONS)).toBe('tema');
    expect(resolveSlug('#tema', NAV_SECTIONS)).toBe('tema');
  });

  it('jatuh ke halaman pertama untuk hash kosong atau tidak dikenal', () => {
    expect(resolveSlug('', NAV_SECTIONS)).toBe('pengantar');
    expect(resolveSlug('#/tidak-ada', NAV_SECTIONS)).toBe('pengantar');
  });
});

describe('findPage', () => {
  it('menemukan halaman berdasarkan slug', () => {
    const page = findPage('aksesibilitas', NAV_SECTIONS);
    expect(page?.title).toBe('Aksesibilitas');
    expect(page?.markdown).toContain('WCAG');
  });

  it('mengembalikan undefined untuk slug tak dikenal', () => {
    expect(findPage('tidak-ada', NAV_SECTIONS)).toBeUndefined();
  });
});
