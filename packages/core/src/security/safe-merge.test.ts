import { describe, expect, it } from 'vitest';
import { SecurityError } from './errors.js';
import { nullPrototypeDict, safeMerge } from './safe-merge.js';

interface Options {
  color: string;
  nested: { width: number; label?: string };
  columns: string[];
}

const base: Options = {
  color: 'merah',
  nested: { width: 10 },
  columns: ['a', 'b'],
};

describe('safeMerge', () => {
  it('menggabungkan nested tanpa memutasi input', () => {
    const merged = safeMerge(base, { nested: { width: 20 } });

    expect(merged.nested.width).toBe(20);
    expect(base.nested.width).toBe(10);
    expect(merged.color).toBe('merah');
  });

  it('mengganti array, bukan menggabungkan per indeks', () => {
    const merged = safeMerge(base, { columns: ['c'] });
    expect(merged.columns).toEqual(['c']);
  });

  it('mengembalikan salinan saat patch kosong', () => {
    const merged = safeMerge(base, undefined);

    expect(merged).toEqual(base);
    expect(merged.nested).not.toBe(base.nested);
  });

  it('menolak key __proto__, constructor, dan prototype', () => {
    for (const key of ['__proto__', 'constructor', 'prototype']) {
      const patch = JSON.parse(
        `{"${key}":{"polluted":true}}`,
      ) as Partial<Options>;
      expect(() => safeMerge(base, patch)).toThrowError(SecurityError);
    }
  });

  it('tidak mencemari Object.prototype', () => {
    const attack = JSON.parse(
      '{"__proto__":{"polluted":true}}',
    ) as Partial<Options>;

    try {
      safeMerge(base, attack);
    } catch {
      // ditolak sesuai rancangan
    }

    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('menolak merge terlalu dalam', () => {
    let patch: Record<string, unknown> = {};
    const root = patch;
    for (let index = 0; index < 5; index += 1) {
      const next: Record<string, unknown> = {};
      patch['deep'] = next;
      patch = next;
    }

    expect(() =>
      safeMerge({} as Options, root as never, { maxDepth: 3 }),
    ).toThrowError(/SUI-SEC-001/);
  });

  it('nullPrototypeDict tidak memiliki prototype', () => {
    const dict = nullPrototypeDict<number>();
    dict['a'] = 1;

    expect(Object.getPrototypeOf(dict)).toBeNull();
    expect(dict['a']).toBe(1);
  });
});
