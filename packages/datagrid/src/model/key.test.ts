import { describe, expect, it } from 'vitest';
import { DataGridError } from '../errors.js';
import {
  assertUniqueKeys,
  buildKeyIndex,
  createKeyResolver,
  encodeKey,
  keyToDomId,
} from './key.js';

interface Row {
  id: number;
  name: string;
}

describe('createKeyResolver', () => {
  it('mengambil key dari field tunggal', () => {
    const resolver = createKeyResolver<Row>('id');
    expect(resolver.keyOf({ id: 7, name: 'A' })).toBe(7);
    expect(resolver.composite).toBe(false);
  });

  it('mendukung fungsi key', () => {
    const resolver = createKeyResolver<Row>((row) => `u-${row.id}`);
    expect(resolver.keyOf({ id: 2, name: 'A' })).toBe('u-2');
  });

  it('menggabungkan composite key dengan pemisah', () => {
    interface Pair {
      a: number;
      b: string;
    }
    const resolver = createKeyResolver<Pair>(['a', 'b']);
    expect(resolver.keyOf({ a: 1, b: 'x' })).toBe('1\u0000x');
    expect(resolver.composite).toBe(true);
  });

  it('menolak keyExpr kosong', () => {
    expect(() => createKeyResolver<Row>(undefined)).toThrowError(DataGridError);
  });

  it('menolak key hilang atau bukan string/number', () => {
    const resolver = createKeyResolver<Row>('id');
    expect(() => resolver.keyOf({ name: 'A' } as Row)).toThrowError(
      /key hilang/,
    );
    expect(() =>
      resolver.keyOf({ id: { nested: true } as never, name: 'A' }),
    ).toThrowError(/harus string atau number/);
  });

  it('membedakan number 1 dan string "1"', () => {
    const resolver = createKeyResolver<Row>('id');
    expect(resolver.equals(1, '1')).toBe(false);
    expect(resolver.equals(1, 1)).toBe(true);
  });
});

describe('encodeKey dan keyToDomId', () => {
  it('membedakan tipe key', () => {
    expect(encodeKey(1)).toBe('n:1');
    expect(encodeKey('1')).toBe('s:1');
    expect(encodeKey(1)).not.toBe(encodeKey('1'));
  });

  it('meng-encode karakter khusus agar aman untuk DOM id', () => {
    expect(encodeKey('a b')).toBe('s:a%20b');
    expect(encodeKey('a/b')).toBe('s:a%2Fb');
    expect(encodeKey('a%00b')).not.toBe(encodeKey('a\u0000b'));
  });

  it('memberi prefix DOM id', () => {
    expect(keyToDomId(3)).toBe('sui-row-n:3');
    expect(keyToDomId('x', 'cell')).toBe('cell-s:x');
  });
});

describe('buildKeyIndex', () => {
  it('memetakan baris berdasarkan key', () => {
    const resolver = createKeyResolver<Row>('id');
    const index = buildKeyIndex(
      [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ],
      resolver,
    );

    expect(index.get(encodeKey(1))?.name).toBe('A');
    expect(index.size).toBe(2);
  });

  it('menolak key duplikat dengan SUI-DG-002', () => {
    const resolver = createKeyResolver<Row>('id');

    try {
      buildKeyIndex(
        [
          { id: 1, name: 'A' },
          { id: 1, name: 'B' },
        ],
        resolver,
      );
      expect.unreachable('harus melempar');
    } catch (error) {
      expect((error as DataGridError).code).toBe('SUI-DG-002');
    }
  });

  it('menolak duplikat composite key', () => {
    interface Pair {
      a: number;
      b: number;
    }
    const resolver = createKeyResolver<Pair>(['a', 'b']);

    expect(() =>
      buildKeyIndex(
        [
          { a: 1, b: 2 },
          { a: 1, b: 2 },
        ],
        resolver,
      ),
    ).toThrowError(/duplikat/);
  });

  it('mengizinkan 1 dan "1" sebagai key berbeda', () => {
    interface Mixed {
      id: number | string;
    }
    const resolver = createKeyResolver<Mixed>('id');
    const index = buildKeyIndex([{ id: 1 }, { id: '1' }], resolver);
    expect(index.size).toBe(2);
  });

  it('assertUniqueKeys lulus untuk data valid', () => {
    const resolver = createKeyResolver<Row>('id');
    expect(() =>
      assertUniqueKeys([{ id: 1, name: 'A' }], resolver),
    ).not.toThrow();
  });
});
