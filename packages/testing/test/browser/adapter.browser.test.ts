import { describe, expect, it } from 'vitest';
import {
  createTestContainer,
  describeAdapterContract,
  runAdapterContract,
  type AdapterFactory,
} from '../../src/adapter.js';

/** Adapter vanilla minimal dengan DOM nyata. */
const createVanillaAdapter: AdapterFactory = (container) => {
  const element = document.createElement('div');
  element.className = 'sui-test-adapter';
  container.append(element);

  return {
    element,
    update: (options) => {
      element.textContent = String(options.label ?? '');
    },
    unmount: () => {
      element.remove();
    },
  };
};

describe('createTestContainer — DOM nyata', () => {
  it('mengembalikan elemen div yang dapat dipakai', () => {
    const container = createTestContainer();

    expect(container).toBeInstanceOf(HTMLElement);
    expect(container.tagName).toBe('DIV');
  });
});

describe('runAdapterContract — DOM nyata', () => {
  it('seluruh skenario lulus untuk adapter vanilla', async () => {
    const results = await runAdapterContract({ create: createVanillaAdapter });

    expect(results).toHaveLength(5);
    expect(results.every((result) => result.passed)).toBe(true);
  });

  it('mendeteksi adapter yang tidak melepas element saat unmount', async () => {
    const leaky = (() => {
      const adapter = createVanillaAdapter;
      return ((container, options) => {
        const handle = adapter(container, options) as {
          element: HTMLElement;
          update: (next: Record<string, unknown>) => void;
          unmount: () => void;
        };
        return { ...handle, unmount: () => {} };
      }) as AdapterFactory;
    })();

    const results = await runAdapterContract({ create: leaky });

    expect(results.some((result) => !result.passed)).toBe(true);
  });
});

describe('describeAdapterContract — DOM nyata', () => {
  describeAdapterContract('vanilla', { create: createVanillaAdapter });
});
