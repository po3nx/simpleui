import { describe, expect, it } from 'vitest';
import type { DataGridError } from '../errors.js';
import {
  flattenGroups,
  groupKey,
  groupRows,
  type GroupNode,
} from './grouping.js';

interface Sale {
  city: string | null;
  product: string;
  amount: number;
}

const ROWS: Sale[] = [
  { city: 'Jakarta', product: 'A', amount: 10 },
  { city: 'Bandung', product: 'B', amount: 20 },
  { city: 'Jakarta', product: 'B', amount: 30 },
  { city: null, product: 'A', amount: 40 },
  { city: 'Jakarta', product: 'A', amount: 50 },
];

describe('groupRows — satu level', () => {
  it('mengelompokkan dan menghitung baris', () => {
    const groups = groupRows(ROWS, ['city']);

    expect(groups).toHaveLength(3);
    expect(groups.map((group) => group.value)).toEqual([
      'Jakarta',
      'Bandung',
      null,
    ]);
    expect(groups.map((group) => group.count)).toEqual([3, 1, 1]);
    expect(groups.every((group) => group.depth === 0)).toBe(true);
  });

  it('mengembalikan kosong tanpa groupBy atau baris', () => {
    expect(groupRows(ROWS, [])).toEqual([]);
    expect(groupRows([], ['city'])).toEqual([]);
  });

  it('tidak memutasi baris masukan', () => {
    const snapshot = ROWS.map((row) => ({ ...row }));
    groupRows(ROWS, ['city']);
    expect(ROWS).toEqual(snapshot);
  });
});

describe('groupRows — multi level', () => {
  it('membentuk pohon dengan depth dan key stabil', () => {
    const groups = groupRows(ROWS, ['city', 'product']);
    const jakarta = groups[0] as GroupNode<Sale>;

    expect(jakarta.depth).toBe(0);
    expect(jakarta.children).toHaveLength(2);
    expect(jakarta.children?.[0]).toMatchObject({
      value: 'A',
      depth: 1,
      count: 2,
      field: 'product',
    });
    expect(jakarta.children?.[0]?.key).toBe(groupKey(['Jakarta', 'A']));
    expect(jakarta.children?.[0]?.children).toBeUndefined();
  });
});

describe('groupKey', () => {
  it('membedakan tipe dan meng-encode string', () => {
    expect(groupKey([1])).toBe('n:1');
    expect(groupKey(['1'])).toBe('s:1');
    expect(groupKey(['a b'])).toBe('s:a%20b');
    expect(groupKey([null])).toBe('n');
    expect(groupKey(['Jakarta', 'A'])).not.toBe(groupKey(['Jakarta', 'B']));
  });
});

describe('groupRows — batas jumlah grup', () => {
  it('menolak bila melebihi maxGroupCount', () => {
    try {
      groupRows(ROWS, ['city'], { maxGroupCount: 2 });
      expect.unreachable('harus melempar');
    } catch (error) {
      expect((error as DataGridError).code).toBe('SUI-DG-009');
    }
  });

  it('menolak batas tidak valid', () => {
    expect(() => groupRows(ROWS, ['city'], { maxGroupCount: 0 })).toThrowError(
      /maxGroupCount/,
    );
  });

  it('berlaku juga pada level anak', () => {
    const nested: Sale[] = [
      { city: 'X', product: 'A', amount: 1 },
      { city: 'X', product: 'B', amount: 2 },
      { city: 'X', product: 'C', amount: 3 },
    ];

    expect(() =>
      groupRows(nested, ['city', 'product'], { maxGroupCount: 2 }),
    ).toThrowError(/level 2/);
  });
});

describe('flattenGroups', () => {
  const groups = groupRows(ROWS, ['city']);

  it('collapsed hanya menampilkan header grup', () => {
    const entries = flattenGroups(groups);
    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.type === 'group')).toBe(true);
    expect(entries[0]?.type === 'group' && entries[0].expanded).toBe(false);
  });

  it('expanded menampilkan header lalu baris', () => {
    const entries = flattenGroups(groups, [groups[0]?.key ?? '']);
    // Header Jakarta + 3 baris + header Bandung + header null.
    expect(entries).toHaveLength(1 + 3 + 2);

    expect(entries[0]).toMatchObject({ type: 'group', expanded: true });
    expect(entries[1]).toMatchObject({ type: 'row', depth: 1 });
    expect(entries[4]?.type).toBe('group');
    expect(entries[4]?.type === 'group' && entries[4].expanded).toBe(false);
  });

  it('autoExpandAll membuka semua grup', () => {
    const entries = flattenGroups(groups, [], true);
    expect(entries.filter((entry) => entry.type === 'row')).toHaveLength(5);
    expect(entries).toHaveLength(3 + 5);
  });

  it('multi-level dapat dibuka sebagian', () => {
    const tree = groupRows(ROWS, ['city', 'product']);
    const jakarta = tree[0] as GroupNode<Sale>;
    const productA = jakarta.children?.[0] as GroupNode<Sale>;

    const entries = flattenGroups(tree, [jakarta.key, productA.key]);

    expect(entries[0]).toMatchObject({ type: 'group', expanded: true });
    expect(entries[1]).toMatchObject({ type: 'group', expanded: true });
    expect(entries[2]).toMatchObject({ type: 'row' });
    expect(entries[3]).toMatchObject({ type: 'row' });
    expect(entries[4]?.type).toBe('group');
    expect(entries[4]?.type === 'group' && entries[4].node.value).toBe('B');
    expect(entries[4]?.type === 'group' && entries[4].expanded).toBe(false);
  });
});
