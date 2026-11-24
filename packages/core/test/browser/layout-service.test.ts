import { describe, expect, it, vi } from 'vitest';
import { createLayoutService } from '../../src/layout/layout-service.js';
import { createElement, setStyle } from '../../src/dom/dom.js';

/**
 * Verifikasi dengan ResizeObserver sungguhan di Chromium (ADR-0009):
 * event resize tidak dapat disimulasikan dengan andal di Node.
 */

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 2000,
): Promise<void> {
  const started = performance.now();
  while (!predicate()) {
    if (performance.now() - started > timeoutMs) {
      throw new Error('Timeout menunggu perubahan ukuran');
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

describe('createLayoutService — ResizeObserver nyata', () => {
  it('memberi tahu listener saat ukuran elemen berubah', async () => {
    const service = createLayoutService();
    const element = createElement('div', { text: 'konten' });
    setStyle(element, 'width', '100px');
    setStyle(element, 'height', '40px');
    document.body.append(element);

    const sizes: Array<{ width: number; height: number }> = [];
    const stop = service.observe(element, (size) => sizes.push(size));

    await waitFor(() => sizes.length > 0);
    expect(sizes.at(-1)).toEqual({ width: 100, height: 40 });

    setStyle(element, 'width', '160px');
    await waitFor(() => sizes.at(-1)?.width === 160);

    expect(sizes.at(-1)).toEqual({ width: 160, height: 40 });

    stop();
    service.dispose();
    element.remove();
  });

  it('berhenti memantau setelah listener dilepas', async () => {
    const service = createLayoutService();
    const element = createElement('div');
    setStyle(element, 'width', '80px');
    setStyle(element, 'height', '20px');
    document.body.append(element);

    const listener = vi.fn();
    const stop = service.observe(element, listener);
    await waitFor(() => listener.mock.calls.length > 0);

    stop();
    expect(service.observedCount).toBe(0);

    setStyle(element, 'width', '200px');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const callsAfterStop = listener.mock.calls.length;
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(listener.mock.calls.length).toBe(callsAfterStop);

    service.dispose();
    element.remove();
  });

  it('dispose memutus semua pemantauan', () => {
    const service = createLayoutService();
    const element = createElement('div');
    document.body.append(element);

    service.observe(element, () => {});
    service.dispose();

    expect(service.disposed).toBe(true);
    expect(service.observedCount).toBe(0);

    element.remove();
  });
});
