import { describe, expect, it } from 'vitest';
import { createSeededRandom, hashSeed } from './random.js';

describe('hashSeed', () => {
  it('deterministik untuk seed yang sama', () => {
    expect(hashSeed('simpleui')).toBe(hashSeed('simpleui'));
    expect(hashSeed(42)).toBe(hashSeed(42));
  });

  it('berbeda untuk seed berbeda', () => {
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
});

describe('createSeededRandom', () => {
  it('menghasilkan urutan sama untuk seed sama', () => {
    const first = createSeededRandom('seed-1');
    const second = createSeededRandom('seed-1');

    const a = Array.from({ length: 5 }, () => first.next());
    const b = Array.from({ length: 5 }, () => second.next());

    expect(a).toEqual(b);
    expect(a.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('berbeda untuk seed berbeda', () => {
    const first = createSeededRandom('seed-1');
    const second = createSeededRandom('seed-2');

    expect(first.next()).not.toBe(second.next());
  });

  it('int selalu di dalam batas', () => {
    const random = createSeededRandom('int');
    for (let index = 0; index < 100; index += 1) {
      const value = random.int(5, 9);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(9);
      expect(Number.isInteger(value)).toBe(true);
    }
    expect(() => random.int(9, 5)).toThrowError(RangeError);
  });

  it('pick memilih elemen terdaftar dan menolak daftar kosong', () => {
    const random = createSeededRandom('pick');
    const items = ['a', 'b', 'c'] as const;

    for (let index = 0; index < 20; index += 1) {
      expect(items).toContain(random.pick(items));
    }
    expect(() => random.pick([])).toThrowError(RangeError);
  });

  it('shuffle deterministik dan merupakan permutasi', () => {
    const items = [1, 2, 3, 4, 5];
    const first = createSeededRandom('shuffle').shuffle(items);
    const second = createSeededRandom('shuffle').shuffle(items);

    expect(first).toEqual(second);
    expect([...first].sort((a, b) => a - b)).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });

  it('chance menghormati probabilitas', () => {
    const random = createSeededRandom('chance');
    for (let index = 0; index < 20; index += 1) {
      expect(random.chance(0)).toBe(false);
      expect(random.chance(1)).toBe(true);
    }
  });
});
