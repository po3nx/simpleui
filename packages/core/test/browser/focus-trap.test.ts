import { describe, expect, it } from 'vitest';
import { FocusTrap, getFocusable } from '../../src/a11y/focus-trap.js';
import { createElement } from '../../src/dom/dom.js';

function keydown(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, cancelable: true, ...init });
}

function setupRoot(): { root: HTMLElement; buttons: HTMLButtonElement[] } {
  const root = createElement('div');
  const buttons = [0, 1, 2].map((index) =>
    createElement('button', { text: `tombol ${index}` }),
  );
  root.append(...buttons);
  document.body.append(root);
  return { root, buttons };
}

describe('getFocusable', () => {
  it('hanya mengembalikan elemen yang dapat difokuskan', () => {
    const root = createElement('div');
    const enabled = createElement('button', { text: 'aktif' });
    const disabled = createElement('button', { text: 'nonaktif' });
    disabled.disabled = true;
    const hidden = createElement('button', { text: 'tersembunyi' });
    hidden.hidden = true;
    const ariaHidden = createElement('button', { text: 'aria-hidden' });
    ariaHidden.setAttribute('aria-hidden', 'true');

    root.append(enabled, disabled, hidden, ariaHidden);

    expect(getFocusable(root)).toEqual([enabled]);
  });
});

describe('FocusTrap', () => {
  it('memfokuskan elemen pertama saat aktif dan mengembalikan fokus saat nonaktif', () => {
    const { root, buttons } = setupRoot();
    const outside = createElement('button', { text: 'luar' });
    document.body.append(outside);
    outside.focus();

    const trap = new FocusTrap(root);
    trap.activate();
    expect(document.activeElement).toBe(buttons[0]);

    trap.deactivate();
    expect(document.activeElement).toBe(outside);

    root.remove();
    outside.remove();
  });

  it('menghormati initialFocus', () => {
    const { root, buttons } = setupRoot();
    const trap = new FocusTrap(root, { initialFocus: buttons[2] });

    trap.activate();
    expect(document.activeElement).toBe(buttons[2]);

    trap.deactivate();
    root.remove();
  });

  it('memutar fokus dari elemen terakhir ke pertama pada Tab', () => {
    const { root, buttons } = setupRoot();
    const trap = new FocusTrap(root);
    trap.activate();
    buttons[2]?.focus();

    const event = keydown('Tab');
    expect(trap.handleKeyDown(event)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);

    trap.deactivate();
    root.remove();
  });

  it('memutar fokus dari elemen pertama ke terakhir pada Shift+Tab', () => {
    const { root, buttons } = setupRoot();
    const trap = new FocusTrap(root);
    trap.activate();
    buttons[0]?.focus();

    const event = keydown('Tab', { shiftKey: true });
    expect(trap.handleKeyDown(event)).toBe(true);
    expect(document.activeElement).toBe(buttons[2]);

    trap.deactivate();
    root.remove();
  });

  it('membiarkan browser menangani Tab di tengah daftar', () => {
    const { root, buttons } = setupRoot();
    const trap = new FocusTrap(root);
    trap.activate();
    buttons[1]?.focus();

    expect(trap.handleKeyDown(keydown('Tab'))).toBe(false);

    trap.deactivate();
    root.remove();
  });

  it('menarik fokus kembali ke dalam root bila fokus keluar', () => {
    const { root, buttons } = setupRoot();
    const outside = createElement('button', { text: 'luar' });
    document.body.append(outside);

    const trap = new FocusTrap(root);
    trap.activate();
    outside.focus();

    expect(trap.handleKeyDown(keydown('Tab'))).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);

    trap.deactivate();
    root.remove();
    outside.remove();
  });

  it('mengabaikan Tab saat trap belum aktif', () => {
    const { root } = setupRoot();
    const trap = new FocusTrap(root);

    expect(trap.handleKeyDown(keydown('Tab'))).toBe(false);
    expect(trap.active).toBe(false);

    root.remove();
  });
});
