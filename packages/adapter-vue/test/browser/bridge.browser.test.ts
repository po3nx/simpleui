import { describeAdapterContract } from '@simpleui/testing/adapter';
import { describe, expect, it } from 'vitest';
import { createVueBridge, type BridgeOptions } from '../../src/index.js';

/**
 * Kontrak adapter (FND-028): mount/update/unmount di DOM nyata.
 * Vue harus lulus lima skenario kontrak dan memperbarui isi daftar.
 */
function createHarness(
  container: HTMLElement,
  options: Record<string, unknown>,
) {
  const bridge = createVueBridge();
  bridge.mount(container, options as BridgeOptions);

  return {
    element: container.firstElementChild as HTMLElement,
    update: (next: Record<string, unknown>) =>
      bridge.update(next as BridgeOptions),
    unmount: () => {
      bridge.unmount();
    },
  };
}

describeAdapterContract('Vue', { create: createHarness });

describe('Vue — isi daftar', () => {
  it('menampilkan item, memperbarui, lalu membersihkan DOM', async () => {
    const container = document.createElement('div');
    const bridge = createVueBridge();

    bridge.mount(container, { items: ['a', 'b'], label: 'daftar' });
    await expect.poll(() => container.querySelectorAll('li').length).toBe(2);

    await bridge.update({ items: ['c'], label: 'daftar' });
    await expect.poll(() => container.textContent).toContain('c');

    bridge.unmount();
    expect(container.childElementCount).toBe(0);
  });
});
