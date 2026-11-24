import { describeAdapterContract } from '@simpleui/testing/adapter';
import { describe, expect, it } from 'vitest';
import { createAngularBridge, type BridgeOptions } from '../../src/index.js';

/**
 * Kontrak adapter Angular (FND-028): mount/update/unmount di DOM nyata dengan
 * aplikasi zoneless dan JIT compiler.
 */
async function createHarness(
  container: HTMLElement,
  options: Record<string, unknown>,
) {
  const bridge = createAngularBridge();
  await bridge.mount(container, options as BridgeOptions);

  return {
    element: container.firstElementChild as HTMLElement,
    update: (next: Record<string, unknown>) =>
      bridge.update(next as BridgeOptions),
    unmount: () => {
      bridge.unmount();
    },
  };
}

describeAdapterContract('Angular', { create: createHarness });

describe('Angular — isi daftar', () => {
  it('menampilkan item, memperbarui, lalu membersihkan DOM', async () => {
    const container = document.createElement('div');
    const bridge = createAngularBridge();

    await bridge.mount(container, { items: ['a', 'b'], label: 'daftar' });
    await expect.poll(() => container.querySelectorAll('li').length).toBe(2);

    bridge.update({ items: ['c'], label: 'daftar' });
    await expect.poll(() => container.textContent).toContain('c');

    bridge.unmount();
    expect(container.childElementCount).toBe(0);
  });
});
