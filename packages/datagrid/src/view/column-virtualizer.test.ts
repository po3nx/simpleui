import { describe, expect, it } from 'vitest';
import { normalizeColumnModel } from '../model/columns.js';
import { computeColumnLayout } from './column-virtualizer.js';

interface Row {
  id: number;
}

function columns(count: number) {
  return normalizeColumnModel<Row>(
    Array.from({ length: count }, (_, index) => ({
      dataField: 'id',
      id: `c${index}`,
      caption: `C${index}`,
      width: 100,
    })),
  );
}

describe('computeColumnLayout — virtualisasi', () => {
  it('merender semua kolom bila muat di viewport', () => {
    const layout = computeColumnLayout(columns(5), 1000, 0);
    expect(layout.columns).toHaveLength(5);
    expect(layout.totalWidth).toBe(500);
    expect(layout.shadowStart).toBe(false);
    expect(layout.shadowEnd).toBe(false);
  });

  it('merender subset + overscan saat banyak kolom', () => {
    const layout = computeColumnLayout(columns(100), 500, 0, 1);
    const ids = layout.columns.map((entry) => entry.column.id);

    expect(ids[0]).toBe('c0');
    expect(ids).toContain('c5');
    expect(ids.length).toBeLessThanOrEqual(9);
    expect(layout.totalWidth).toBe(10_000);
  });

  it('menggeser jendela saat scroll horizontal', () => {
    const layout = computeColumnLayout(columns(100), 500, 3000, 1);
    const ids = layout.columns.map((entry) => entry.column.id);

    expect(ids).toContain('c30');
    expect(ids).not.toContain('c0');
    expect(ids).not.toContain('c99');
  });

  it('menangani viewport 0 dengan merender semua', () => {
    const layout = computeColumnLayout(columns(20), 0, 0);
    expect(layout.columns).toHaveLength(20);
  });
});

describe('computeColumnLayout — sticky columns', () => {
  const withFixed = normalizeColumnModel<Row>([
    { dataField: 'id', id: 'pin-start', width: 60, fixed: 'start' },
    { dataField: 'id', id: 'mid-1', width: 100 },
    { dataField: 'id', id: 'mid-2', width: 100 },
    { dataField: 'id', id: 'pin-end', width: 80, fixed: 'end' },
  ]);

  it('selalu menyertakan kolom fixed di depan dan belakang', () => {
    const layout = computeColumnLayout(withFixed, 300, 0);
    const ids = layout.columns.map((entry) => entry.column.id);

    expect(ids[0]).toBe('pin-start');
    expect(ids[ids.length - 1]).toBe('pin-end');
    expect(layout.totalWidth).toBe(360); // lebar 60 dijepit minWidth 80
  });

  it('memberi offset sticky dan shadow saat scroll', () => {
    const layout = computeColumnLayout(withFixed, 200, 80);

    const first = layout.columns[0];
    const last = layout.columns[layout.columns.length - 1];
    expect(first?.stickyOffset).toBe(0);
    expect(last?.stickyOffset).toBe(0);
    expect(first?.shadow).toBe('start');
    expect(last?.shadow).toBe('end');
    expect(layout.shadowStart).toBe(true);
    expect(layout.shadowEnd).toBe(true);
  });

  it('tanpa scroll tidak ada shadow', () => {
    const layout = computeColumnLayout(withFixed, 1000, 0);
    expect(layout.shadowStart).toBe(false);
    expect(layout.shadowEnd).toBe(false);
  });
});
