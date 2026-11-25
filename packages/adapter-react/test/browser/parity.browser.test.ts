import { describe, expect, it } from 'vitest';
import { createVanillaBridge } from '@simpleui/vanilla';
import { createReactBridge } from '../../src/index.js';

interface Snapshot {
  readonly tag: string;
  readonly className: string;
  readonly label: string | null;
  readonly items: string[];
}

function snapshot(root: HTMLElement): Snapshot {
  const element = root.firstElementChild as HTMLElement;
  return {
    tag: element.tagName,
    className: element.className,
    label: element.getAttribute('aria-label'),
    items: [...element.children].map((child) => child.textContent ?? ''),
  };
}

describe('parity React vs vanilla — dasar', () => {
  it('menghasilkan struktur dan isi DOM yang sama', async () => {
    const reactHost = document.createElement('div');
    const vanillaHost = document.createElement('div');
    document.body.append(reactHost, vanillaHost);

    const react = createReactBridge();
    const vanilla = createVanillaBridge();
    react.mount(reactHost, { items: ['a', 'b', 'c'], label: 'Daftar' });
    vanilla.mount(vanillaHost, { items: ['a', 'b', 'c'], label: 'Daftar' });

    expect(snapshot(reactHost)).toEqual(snapshot(vanillaHost));

    react.update({ items: ['x'], label: 'Daftar' });
    vanilla.update({ items: ['x'], label: 'Daftar' });
    expect(snapshot(reactHost)).toEqual(snapshot(vanillaHost));
    expect(snapshot(reactHost).items).toEqual(['x']);

    react.unmount();
    vanilla.unmount();
    expect(reactHost.childElementCount).toBe(0);
    expect(vanillaHost.childElementCount).toBe(0);

    reactHost.remove();
    vanillaHost.remove();
  });
});
