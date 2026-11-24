import { describe, it } from 'vitest';

/**
 * Kontrak adapter + parity harness (FND-020,
 * docs/02-adapter-cross-framework.md §8).
 *
 * Satu set skenario dijalankan untuk setiap adapter (React/Vue/Angular/
 * vanilla) agar perilaku mount/update/unmount identik.
 */

export type AdapterOptions = Record<string, unknown>;

export interface AdapterHandle {
  readonly element: HTMLElement;
  update(options: AdapterOptions): Promise<void> | void;
  unmount(): Promise<void> | void;
}

export type AdapterFactory = (
  container: HTMLElement,
  options: AdapterOptions,
) => Promise<AdapterHandle> | AdapterHandle;

export interface AdapterContractConfig {
  readonly create: AdapterFactory;
  /** Opsi awal untuk skenario yang membutuhkannya. */
  readonly options?: AdapterOptions;
}

export interface ContractScenario {
  readonly name: string;
  run(create: AdapterFactory, options: AdapterOptions): Promise<void>;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

/** Container uji: DOM asli bila tersedia, fake minimal untuk Node. */
export function createTestContainer(): HTMLElement {
  if (typeof document !== 'undefined') return document.createElement('div');

  const children: HTMLElement[] = [];
  return {
    children,
    get childElementCount() {
      return children.length;
    },
    append: (child: HTMLElement) => {
      children.push(child);
    },
    removeChild: (child: HTMLElement) => {
      const index = children.indexOf(child);
      if (index >= 0) children.splice(index, 1);
      return child;
    },
  } as unknown as HTMLElement;
}

async function mountOnce(
  create: AdapterFactory,
  options: AdapterOptions,
): Promise<{ container: HTMLElement; handle: AdapterHandle }> {
  const container = createTestContainer();
  const handle = await create(container, options);
  return { container, handle };
}

export const CONTRACT_SCENARIOS: readonly ContractScenario[] = [
  {
    name: 'mount menempelkan tepat satu element ke container',
    async run(create, options) {
      const { container, handle } = await mountOnce(create, options);

      assert(container.childElementCount === 1, 'element tidak ditempelkan');
      assert(Boolean(handle.element), 'handle.element kosong');
      await handle.unmount();
    },
  },
  {
    name: 'update tidak melepas element',
    async run(create, options) {
      const { container, handle } = await mountOnce(create, options);

      await handle.update({ ...options, label: 'berubah' });

      assert(
        container.childElementCount === 1,
        'element hilang setelah update',
      );
      await handle.unmount();
    },
  },
  {
    name: 'unmount melepas element dari container',
    async run(create, options) {
      const { container, handle } = await mountOnce(create, options);

      await handle.unmount();

      assert(container.childElementCount === 0, 'element masih menempel');
    },
  },
  {
    name: 'mount → unmount → mount ulang berhasil',
    async run(create, options) {
      const first = await mountOnce(create, options);
      await first.handle.unmount();

      const second = await mountOnce(create, options);
      assert(second.container.childElementCount === 1, 'mount ulang gagal');
      await second.handle.unmount();
    },
  },
  {
    name: 'unmount idempoten',
    async run(create, options) {
      const { handle } = await mountOnce(create, options);

      await handle.unmount();
      await handle.unmount();
    },
  },
];

export interface ScenarioResult {
  readonly name: string;
  readonly passed: boolean;
  readonly error?: unknown;
}

/** Jalankan seluruh skenario dan kembalikan hasil tanpa melempar. */
export async function runAdapterContract(
  config: AdapterContractConfig,
): Promise<ScenarioResult[]> {
  const options = config.options ?? {};
  const results: ScenarioResult[] = [];

  for (const scenario of CONTRACT_SCENARIOS) {
    try {
      await scenario.run(config.create, options);
      results.push({ name: scenario.name, passed: true });
    } catch (error) {
      results.push({ name: scenario.name, passed: false, error });
    }
  }

  return results;
}

/**
 * Daftarkan kontrak adapter sebagai test Vitest.
 *
 * ```ts
 * describeAdapterContract('DataGrid (react)', {
 *   create: (container, options) => createReactHarness(container, options),
 * });
 * ```
 */
export function describeAdapterContract(
  name: string,
  config: AdapterContractConfig,
): void {
  describe(`kontrak adapter: ${name}`, () => {
    for (const scenario of CONTRACT_SCENARIOS) {
      it(scenario.name, async () => {
        await scenario.run(config.create, config.options ?? {});
      });
    }
  });
}
