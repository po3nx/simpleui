import { describe, expect, it } from 'vitest';
import {
  createTestContainer,
  describeAdapterContract,
  runAdapterContract,
  type AdapterFactory,
} from './adapter.js';

function createFakeAdapter(failOnSecondUnmount = false): AdapterFactory {
  return (container) => {
    const element = {
      textContent: '',
    } as unknown as HTMLElement;

    container.append(element);
    let mounted = true;

    return {
      element,
      update: (options) => {
        (element as { textContent: string }).textContent = String(
          options.label ?? '',
        );
      },
      unmount: () => {
        if (!mounted && failOnSecondUnmount) {
          throw new Error('unmount dipanggil dua kali');
        }
        if (!mounted) return;
        mounted = false;
        container.removeChild(element);
      },
    };
  };
}

describe('createTestContainer', () => {
  it('menyediakan container dengan append/removeChild di Node', () => {
    const container = createTestContainer();
    const element = {} as HTMLElement;

    container.append(element);
    expect(container.childElementCount).toBe(1);

    container.removeChild(element);
    expect(container.childElementCount).toBe(0);
  });
});

describe('runAdapterContract', () => {
  it('melaporkan seluruh skenario lulus untuk adapter yang benar', async () => {
    const results = await runAdapterContract({ create: createFakeAdapter() });

    expect(results).toHaveLength(5);
    expect(results.every((result) => result.passed)).toBe(true);
  });

  it('menandai skenario gagal tanpa melempar', async () => {
    const results = await runAdapterContract({
      create: createFakeAdapter(true),
    });

    const failed = results.filter((result) => !result.passed);
    expect(failed).toHaveLength(1);
    expect(failed[0]?.name).toContain('idempoten');
    expect(failed[0]?.error).toBeInstanceOf(Error);
  });

  it('meneruskan opsi awal ke adapter', async () => {
    const seen: string[] = [];
    const results = await runAdapterContract({
      options: { label: 'awal' },
      create: (container, options) => {
        seen.push(String(options.label));
        return createFakeAdapter()(container, options);
      },
    });

    expect(results.every((result) => result.passed)).toBe(true);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]).toBe('awal');
  });
});

describe('describeAdapterContract', () => {
  describeAdapterContract('fake', { create: createFakeAdapter() });
});
