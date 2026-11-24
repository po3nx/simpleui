import { describe, expect, it } from 'vitest';
import {
  isActivationKey,
  isEscapeKey,
  isNavigationKey,
  nextIndex,
} from './keyboard.js';

describe('predikat tombol', () => {
  it('mengenali tombol navigasi', () => {
    for (const key of [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End',
    ]) {
      expect(isNavigationKey(key)).toBe(true);
    }
    expect(isNavigationKey('Enter')).toBe(false);
  });

  it('mengenali tombol aktivasi', () => {
    expect(isActivationKey('Enter')).toBe(true);
    expect(isActivationKey(' ')).toBe(true);
    expect(isActivationKey('Spacebar')).toBe(true);
    expect(isActivationKey('ArrowDown')).toBe(false);
  });

  it('mengenali Escape', () => {
    expect(isEscapeKey('Escape')).toBe(true);
    expect(isEscapeKey('Esc')).toBe(true);
    expect(isEscapeKey('Enter')).toBe(false);
  });
});

describe('nextIndex — orientasi vertikal', () => {
  it('bergerak ke bawah dan ke atas', () => {
    expect(nextIndex(0, 3, 'ArrowDown')).toBe(1);
    expect(nextIndex(2, 3, 'ArrowUp')).toBe(1);
  });

  it('menahan di batas tanpa wrap', () => {
    expect(nextIndex(2, 3, 'ArrowDown')).toBe(2);
    expect(nextIndex(0, 3, 'ArrowUp')).toBe(0);
  });

  it('mengabaikan tombol horizontal', () => {
    expect(nextIndex(1, 3, 'ArrowRight')).toBeNull();
    expect(nextIndex(1, 3, 'ArrowLeft')).toBeNull();
  });

  it('mendukung Home dan End', () => {
    expect(nextIndex(1, 3, 'Home')).toBe(0);
    expect(nextIndex(1, 3, 'End')).toBe(2);
  });
});

describe('nextIndex — orientasi horizontal', () => {
  it('bergerak ke kanan dan ke kiri', () => {
    expect(nextIndex(0, 3, 'ArrowRight', { orientation: 'horizontal' })).toBe(
      1,
    );
    expect(nextIndex(2, 3, 'ArrowLeft', { orientation: 'horizontal' })).toBe(1);
  });

  it('mengabaikan tombol vertikal', () => {
    expect(
      nextIndex(1, 3, 'ArrowDown', { orientation: 'horizontal' }),
    ).toBeNull();
  });
});

describe('nextIndex — orientasi both dan wrap', () => {
  it('merespons semua arah panah pada mode both', () => {
    expect(nextIndex(0, 3, 'ArrowDown', { orientation: 'both' })).toBe(1);
    expect(nextIndex(0, 3, 'ArrowRight', { orientation: 'both' })).toBe(1);
    expect(nextIndex(1, 3, 'ArrowUp', { orientation: 'both' })).toBe(0);
    expect(nextIndex(1, 3, 'ArrowLeft', { orientation: 'both' })).toBe(0);
  });

  it('berputar di kedua ujung saat wrap aktif', () => {
    expect(nextIndex(2, 3, 'ArrowDown', { wrap: true })).toBe(0);
    expect(nextIndex(0, 3, 'ArrowUp', { wrap: true })).toBe(2);
    expect(
      nextIndex(2, 3, 'ArrowRight', { orientation: 'horizontal', wrap: true }),
    ).toBe(0);
  });

  it('mengembalikan null untuk daftar kosong atau tombol tak dikenal', () => {
    expect(nextIndex(0, 0, 'ArrowDown')).toBeNull();
    expect(nextIndex(0, 3, 'Enter')).toBeNull();
  });

  it('memperlakukan indeks awal negatif sebagai awal daftar', () => {
    expect(nextIndex(-1, 3, 'ArrowDown')).toBe(0);
  });
});
