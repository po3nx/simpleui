import { describe, expect, it } from 'vitest';
import { RovingTabindex } from '../../src/a11y/roving.js';
import { createElement } from '../../src/dom/dom.js';

function makeItems(count: number): HTMLElement[] {
  return Array.from({ length: count }, (_value, index) =>
    createElement('button', { text: `item ${index}` }),
  );
}

function keydown(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, cancelable: true, ...init });
}

describe('RovingTabindex', () => {
  it('memberi tabindex 0 hanya pada item aktif', () => {
    const items = makeItems(3);
    const roving = new RovingTabindex({ getItems: () => items });

    expect(items.map((item) => item.tabIndex)).toEqual([0, -1, -1]);
    expect(roving.activeIndex).toBe(0);
  });

  it('menangani tombol panah dan memindahkan fokus', () => {
    const items = makeItems(3);
    items.forEach((item) => document.body.append(item));
    const roving = new RovingTabindex({ getItems: () => items });

    const handled = roving.handleKeyDown(keydown('ArrowDown'));

    expect(handled).toBe(true);
    expect(roving.activeIndex).toBe(1);
    expect(items.map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
    expect(document.activeElement).toBe(items[1]);

    items.forEach((item) => item.remove());
  });

  it('mendukung Home dan End', () => {
    const items = makeItems(4);
    const roving = new RovingTabindex({ getItems: () => items });

    roving.handleKeyDown(keydown('End'));
    expect(roving.activeIndex).toBe(3);

    roving.handleKeyDown(keydown('Home'));
    expect(roving.activeIndex).toBe(0);
  });

  it('mengabaikan tombol di luar orientasi', () => {
    const items = makeItems(3);
    const roving = new RovingTabindex({ getItems: () => items });

    const handled = roving.handleKeyDown(keydown('ArrowRight'));

    expect(handled).toBe(false);
    expect(roving.activeIndex).toBe(0);
  });

  it('berputar saat wrap aktif', () => {
    const items = makeItems(2);
    const roving = new RovingTabindex({ getItems: () => items, wrap: true });

    roving.handleKeyDown(keydown('ArrowUp'));
    expect(roving.activeIndex).toBe(1);
  });

  it('mengabaikan tombol non-navigasi', () => {
    const items = makeItems(2);
    const roving = new RovingTabindex({ getItems: () => items });

    expect(roving.handleKeyDown(keydown('Enter'))).toBe(false);
  });

  it('sync menyesuaikan diri saat daftar berubah', () => {
    let items = makeItems(3);
    const roving = new RovingTabindex({ getItems: () => items });
    roving.activate(2);

    items = makeItems(1);
    roving.sync();

    expect(roving.activeIndex).toBe(0);
    expect(items[0]?.tabIndex).toBe(0);
  });

  it('activate memfokuskan item bila diminta', () => {
    const items = makeItems(2);
    items.forEach((item) => document.body.append(item));
    const roving = new RovingTabindex({ getItems: () => items });

    roving.activate(1, { focus: true });

    expect(document.activeElement).toBe(items[1]);
    items.forEach((item) => item.remove());
  });

  it('dispose mengabaikan interaksi berikutnya', () => {
    const items = makeItems(2);
    const roving = new RovingTabindex({ getItems: () => items });

    roving.dispose();

    expect(roving.disposed).toBe(true);
    expect(roving.handleKeyDown(keydown('ArrowDown'))).toBe(false);
  });
});
