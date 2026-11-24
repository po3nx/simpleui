import { createTemplateBridge } from '@simpleui/core';
import { describe, expect, it } from 'vitest';

/** Template vanilla: callback menulis DOM, bridge menangani lifecycle. */
function renderVanilla(
  container: HTMLElement,
  context: { value: unknown },
): void {
  const span = document.createElement('span');
  span.className = 'tpl';
  span.textContent = String(context.value);
  container.append(span);
  void context;
}

describe('TemplateBridge + vanilla', () => {
  it('render, update, dan dispose membersihkan container', () => {
    const container = document.createElement('div');
    const bridge = createTemplateBridge(renderVanilla);
    const handle = bridge.createHandle(container, {
      data: null,
      value: 'satu',
      index: 0,
    });

    expect(container.textContent).toBe('satu');

    handle.update({ data: null, value: 'dua', index: 1 });
    expect(container.textContent).toBe('dua');

    handle.dispose();
    expect(container.childElementCount).toBe(0);
    expect(bridge.activeCount).toBe(0);
  });
});
