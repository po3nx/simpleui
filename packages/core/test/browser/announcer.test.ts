import { afterEach, describe, expect, it, vi } from 'vitest';
import { Announcer } from '../../src/a11y/announcer.js';
import { createElement } from '../../src/dom/dom.js';

function createContainer(): HTMLElement {
  const container = createElement('div');
  document.body.append(container);
  return container;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('Announcer', () => {
  it('membuat satu region polite dengan atribut ARIA yang benar', () => {
    vi.useFakeTimers();
    const container = createContainer();
    const announcer = new Announcer({ container, throttleMs: 100 });

    announcer.announce('3 baris dipilih');
    vi.advanceTimersByTime(100);

    const region = container.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region?.getAttribute('aria-atomic')).toBe('true');
    expect(region?.getAttribute('role')).toBe('status');
    expect(region?.textContent).toBe('3 baris dipilih');
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1);

    announcer.dispose();
    container.remove();
  });

  it('men-throttle pesan dan hanya mengumumkan yang terbaru', () => {
    vi.useFakeTimers();
    const container = createContainer();
    const announcer = new Announcer({ container, throttleMs: 100 });

    announcer.announce('pertama');
    announcer.announce('kedua');
    vi.advanceTimersByTime(100);

    const region = container.querySelector('[aria-live="polite"]');
    expect(region?.textContent).toBe('kedua');
    expect(container.querySelectorAll('[aria-live]')).toHaveLength(1);

    announcer.dispose();
    container.remove();
  });

  it('memakai region assertive terpisah bila diminta', () => {
    vi.useFakeTimers();
    const container = createContainer();
    const announcer = new Announcer({ container, throttleMs: 50 });

    announcer.announce('galat', 'assertive');
    vi.advanceTimersByTime(50);

    expect(
      container.querySelector('[aria-live="assertive"]')?.textContent,
    ).toBe('galat');

    announcer.dispose();
    container.remove();
  });

  it('mengabaikan pesan kosong', () => {
    vi.useFakeTimers();
    const container = createContainer();
    const announcer = new Announcer({ container, throttleMs: 50 });

    announcer.announce('');
    vi.advanceTimersByTime(50);

    expect(container.querySelectorAll('[aria-live]')).toHaveLength(0);

    announcer.dispose();
    container.remove();
  });

  it('clear mengosongkan region yang sudah dibuat', () => {
    vi.useFakeTimers();
    const container = createContainer();
    const announcer = new Announcer({ container, throttleMs: 0 });

    announcer.announce('status');
    vi.advanceTimersByTime(0);
    announcer.clear();

    expect(container.querySelector('[aria-live="polite"]')?.textContent).toBe(
      '',
    );

    announcer.dispose();
    container.remove();
  });

  it('dispose menghapus region dan membatalkan pengumuman tertunda', () => {
    vi.useFakeTimers();
    const container = createContainer();
    const announcer = new Announcer({ container, throttleMs: 100 });

    announcer.announce('tertunda');
    announcer.dispose();
    vi.advanceTimersByTime(200);

    expect(container.querySelectorAll('[aria-live]')).toHaveLength(0);
    expect(container.childElementCount).toBe(0);

    container.remove();
  });
});
