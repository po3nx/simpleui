import { describe, expect, it } from 'vitest';
import { SimpleUIError } from './errors.js';
import { mergeOptions } from './options.js';

interface Options {
  label: string;
  count: number;
  nested: { a: number };
}

const defaults: Options = { label: 'default', count: 1, nested: { a: 1 } };

describe('mergeOptions', () => {
  it('mengembalikan default saat input tidak diberikan', () => {
    const merged = mergeOptions(defaults);

    expect(merged).toEqual(defaults);
    expect(merged).not.toBe(defaults);
  });

  it('menimpa hanya kunci yang diberikan', () => {
    const merged = mergeOptions(defaults, { count: 5 });

    expect(merged).toEqual({ label: 'default', count: 5, nested: { a: 1 } });
  });

  it('mengabaikan nilai undefined', () => {
    const merged = mergeOptions(defaults, { label: undefined, count: 3 });

    expect(merged.label).toBe('default');
    expect(merged.count).toBe(3);
  });

  it('mengganti objek bersarang utuh, bukan menggabungkan', () => {
    const merged = mergeOptions(defaults, { nested: { a: 2 } });

    expect(merged.nested).toEqual({ a: 2 });
  });

  it('menolak opsi tidak dikenal dengan SUI-CORE-001', () => {
    const invalid = { unknownKey: true } as unknown as Partial<Options>;

    expect(() => mergeOptions(defaults, invalid)).toThrowError(SimpleUIError);
    try {
      mergeOptions(defaults, invalid);
    } catch (error) {
      expect((error as SimpleUIError).code).toBe('SUI-CORE-001');
    }
  });
});
