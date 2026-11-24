import { describe, expect, it } from 'vitest';
import { Virtualizer } from '../../src/view/virtualizer.js';

/**
 * Bukti anggaran untuk exit criteria G1: 100.000 baris tetap di bawah budget
 * frame 16 ms. Pengukuran DOM/frame sesungguhnya untuk DataGrid (DG-004).
 */
describe('Virtualizer — anggaran 100k baris', () => {
  it('menjaga rentang tetap kecil dan pembaruan scroll jauh di bawah 16 ms', () => {
    const rows = 100_000;
    const itemSize = 32;
    const viewport = 800;
    const maxOffset = rows * itemSize - viewport;
    const virtualizer = new Virtualizer({
      itemCount: rows,
      itemSize,
      viewportSize: viewport,
    });

    const updates = 5_000;
    let checksum = 0;
    const started = performance.now();

    for (let index = 0; index < updates; index += 1) {
      virtualizer.setScrollOffset((index * 97) % maxOffset);
      checksum += virtualizer.range.start;
    }

    const elapsed = performance.now() - started;
    const perUpdate = elapsed / updates;
    const { start, end } = virtualizer.range;

    expect(end - start).toBeLessThanOrEqual(32);
    expect(perUpdate).toBeLessThan(16);
    expect(checksum).toBeGreaterThan(0);
  });
});
