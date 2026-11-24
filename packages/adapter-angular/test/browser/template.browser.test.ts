import { createTemplateBridge } from '@simpleui/core';
import { describe, expect, it } from 'vitest';
import { createAngularBridge } from '../../src/index.js';

/**
 * Template Angular dirender lewat bridge adapter (JIT + zoneless).
 * Mount Angular bersifat async, sedangkan TemplateRenderer sinkron; handle
 * menunda update/dispose sampai mount selesai.
 */
function createAngularRenderer() {
  return (container: HTMLElement, context: { value: unknown }) => {
    const bridge = createAngularBridge();
    let disposed = false;
    const mounted = bridge.mount(container, {
      items: [String(context.value)],
      label: 'template',
    });

    return {
      update: (next: { value: unknown }) => {
        void mounted.then(() => {
          if (!disposed) {
            bridge.update({
              items: [String(next.value)],
              label: 'template',
            });
          }
        });
      },
      dispose: () => {
        disposed = true;
        void mounted.then(() => bridge.unmount());
      },
    };
  };
}

describe('TemplateBridge + Angular', () => {
  it('render, update, dan dispose membersihkan container', async () => {
    const container = document.createElement('div');
    const bridge = createTemplateBridge(createAngularRenderer());
    const handle = bridge.createHandle(container, {
      data: { name: 'a' },
      value: 'satu',
      index: 0,
    });

    await expect.poll(() => container.textContent).toContain('satu');

    handle.update({ data: { name: 'b' }, value: 'dua', index: 1 });
    await expect.poll(() => container.textContent).toContain('dua');

    handle.dispose();
    await expect.poll(() => container.childElementCount).toBe(0);
    expect(bridge.activeCount).toBe(0);
  });

  it('dispose bridge melepas semua handle', async () => {
    const bridge = createTemplateBridge(createAngularRenderer());
    const first = document.createElement('div');
    const second = document.createElement('div');

    bridge.createHandle(first, { data: null, value: 'x', index: 0 });
    bridge.createHandle(second, { data: null, value: 'y', index: 1 });
    bridge.dispose();

    await expect.poll(() => first.childElementCount).toBe(0);
    await expect.poll(() => second.childElementCount).toBe(0);
    expect(bridge.activeCount).toBe(0);
  });
});
