import { createTemplateBridge } from '@simpleui/core';
import { createApp, h, nextTick, reactive } from 'vue';
import { describe, expect, it } from 'vitest';

/** Template Vue dirender ke container oleh TemplateBridge (G1). */
function createVueRenderer() {
  return (container: HTMLElement, context: { value: unknown }) => {
    const state = reactive({ value: context.value });
    const app = createApp({
      render: () => h('span', { class: 'tpl' }, String(state.value)),
    });
    app.mount(container);

    return {
      update: (next: { value: unknown }) => {
        state.value = next.value;
        return nextTick();
      },
      dispose: () => app.unmount(),
    };
  };
}

describe('TemplateBridge + Vue', () => {
  it('render, update, dan dispose membersihkan container', async () => {
    const container = document.createElement('div');
    const bridge = createTemplateBridge(createVueRenderer());
    const handle = bridge.createHandle(container, {
      data: { name: 'a' },
      value: 'satu',
      index: 0,
    });

    expect(container.textContent).toBe('satu');
    expect(bridge.activeCount).toBe(1);

    handle.update({ data: { name: 'b' }, value: 'dua', index: 1 });
    await nextTick();
    expect(container.textContent).toBe('dua');

    handle.dispose();
    expect(container.childElementCount).toBe(0);
    expect(bridge.activeCount).toBe(0);
  });

  it('dispose bridge melepas semua handle', () => {
    const bridge = createTemplateBridge(createVueRenderer());
    const first = document.createElement('div');
    const second = document.createElement('div');

    bridge.createHandle(first, { data: null, value: 'x', index: 0 });
    bridge.createHandle(second, { data: null, value: 'y', index: 1 });
    bridge.dispose();

    expect(bridge.activeCount).toBe(0);
    expect(first.childElementCount).toBe(0);
    expect(second.childElementCount).toBe(0);
  });
});
