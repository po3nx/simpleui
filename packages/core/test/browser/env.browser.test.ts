import { describe, expect, it } from 'vitest';
import { isBrowser } from '../../src/env.js';

/**
 * Dijalankan di Chromium nyata lewat proyek `browser` (ADR-0009), bukan jsdom:
 * membuktikan `isBrowser()` benar-benar melihat DOM sungguhan.
 */
describe('isBrowser di browser nyata', () => {
  it('harus true karena window dan document tersedia', () => {
    expect(isBrowser()).toBe(true);
    expect(document.body).toBeDefined();
  });
});
