import { createTemplateBridge } from '@simpleui/core';
import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

/** Template React dirender ke container oleh TemplateBridge (G1). */
function createReactRenderer() {
  return (container: HTMLElement, context: { value: unknown }) => {
    const root = createRoot(container);
    const render = (value: unknown) => {
      flushSync(() =>
        root.render(createElement('span', { className: 'tpl' }, String(value))),
      );
    };
    render(context.value);

    return {
      update: (next: { value: unknown }) => render(next.value),
      dispose: () => flushSync(() => root.unmount()),
    };
  };
}

describe('TemplateBridge + React', () => {
  it('render, update, dan dispose membersihkan container', () => {
    const container = document.createElement('div');
    const bridge = createTemplateBridge(createReactRenderer());
    const handle = bridge.createHandle(container, {
      data: { name: 'a' },
      value: 'satu',
      index: 0,
    });

    expect(container.textContent).toBe('satu');
    expect(bridge.activeCount).toBe(1);

    handle.update({ data: { name: 'b' }, value: 'dua', index: 1 });
    expect(container.textContent).toBe('dua');

    handle.dispose();
    expect(container.childElementCount).toBe(0);
    expect(bridge.activeCount).toBe(0);
  });

  it('dispose bridge melepas semua handle', () => {
    const bridge = createTemplateBridge(createReactRenderer());
    const first = document.createElement('div');
    const second = document.createElement('div');

    bridge.createHandle(first, { data: null, value: 'x', index: 0 });
    bridge.createHandle(second, { data: null, value: 'y', index: 1 });
    expect(bridge.activeCount).toBe(2);

    bridge.dispose();
    expect(bridge.activeCount).toBe(0);
    expect(first.childElementCount).toBe(0);
    expect(second.childElementCount).toBe(0);
  });
});
