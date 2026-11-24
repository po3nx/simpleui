import { afterEach, describe, expect, it, vi } from 'vitest';
import { SimpleUIError } from './errors.js';
import { ComponentKernel } from './kernel.js';

type TestEvents = {
  valueChanged: { value: number };
};

interface TestOptions {
  label: string;
  count: number;
}

function createHost(): HTMLElement & { children: HTMLElement[] } {
  const children: HTMLElement[] = [];
  return {
    children,
    append: (child: HTMLElement) => children.push(child),
  } as unknown as HTMLElement & { children: HTMLElement[] };
}

class TestKernel extends ComponentKernel<TestOptions, TestEvents> {
  renderCount = 0;
  mountCount = 0;
  disposeCount = 0;
  failRender = false;
  failDispose = false;
  readonly elementStub = { remove: vi.fn() } as unknown as HTMLElement;

  constructor(options?: Partial<TestOptions>) {
    super({ label: 'default', count: 1 }, options);
  }

  fire(value: number): void {
    this.emit('valueChanged', { value });
  }

  track(dispose: () => void): () => void {
    return this.addDisposable(dispose);
  }

  activeListeners(): number {
    return this.listenerCount('valueChanged');
  }

  protected createElement(): HTMLElement {
    return this.elementStub;
  }

  protected render(): void {
    this.renderCount += 1;
    if (this.failRender) throw new Error('render gagal');
  }

  protected onMount(): void {
    this.mountCount += 1;
  }

  protected onDispose(): void {
    this.disposeCount += 1;
    if (this.failDispose) throw new Error('dispose gagal');
  }
}

/** Kernel minimal untuk menguji hook default tanpa override. */
class MinimalKernel extends ComponentKernel<TestOptions> {
  protected createElement(): HTMLElement {
    return { remove: vi.fn() } as unknown as HTMLElement;
  }

  protected render(): void {}
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ComponentKernel — lifecycle', () => {
  it('constructor tidak membuat element dan menyimpan opsi', () => {
    const kernel = new TestKernel({ count: 4 });

    expect(kernel.element).toBeNull();
    expect(kernel.mounted).toBe(false);
    expect(kernel.renderCount).toBe(0);
    expect(kernel.option('label')).toBe('default');
    expect(kernel.option('count')).toBe(4);
  });

  it('option sebelum mount hanya menyimpan konfigurasi', () => {
    const kernel = new TestKernel();
    kernel.option('label', 'sebelum');

    expect(kernel.option('label')).toBe('sebelum');
    expect(kernel.renderCount).toBe(0);
  });

  it('mount memasang element, memanggil onMount, lalu render sekali', () => {
    const kernel = new TestKernel();
    const host = createHost();

    kernel.mount(host);

    expect(host.children).toEqual([kernel.elementStub]);
    expect(kernel.mountCount).toBe(1);
    expect(kernel.renderCount).toBe(1);
    expect(kernel.mounted).toBe(true);
  });

  it('mount dua kali ditolak dengan SUI-CORE-003', () => {
    const kernel = new TestKernel();
    kernel.mount(createHost());

    expect(() => kernel.mount(createHost())).toThrowError(SimpleUIError);
    try {
      kernel.mount(createHost());
    } catch (error) {
      expect((error as SimpleUIError).code).toBe('SUI-CORE-003');
    }
  });

  it('mengubah opsi setelah mount memicu render', () => {
    const kernel = new TestKernel();
    kernel.mount(createHost());

    kernel.option('count', 2);
    kernel.option({ label: 'baru', count: 3 });

    expect(kernel.renderCount).toBe(3);
    expect(kernel.option('label')).toBe('baru');
  });

  it('beginUpdate/endUpdate merender sekali untuk banyak perubahan', () => {
    const kernel = new TestKernel();
    kernel.mount(createHost());

    kernel.beginUpdate();
    kernel.option('count', 2);
    kernel.option('count', 3);
    expect(kernel.renderCount).toBe(1);

    kernel.endUpdate();
    expect(kernel.renderCount).toBe(2);
  });

  it('endUpdate tanpa beginUpdate ditolak', () => {
    const kernel = new TestKernel();

    expect(() => kernel.endUpdate()).toThrowError(SimpleUIError);
  });

  it('repaint sebelum mount tidak merender', () => {
    const kernel = new TestKernel();
    kernel.repaint();

    expect(kernel.renderCount).toBe(0);
  });

  it('repaint di dalam batch ditunda sampai endUpdate', () => {
    const kernel = new TestKernel();
    kernel.mount(createHost());
    kernel.beginUpdate();
    kernel.repaint();
    kernel.repaint();

    expect(kernel.renderCount).toBe(1);
    kernel.endUpdate();
    expect(kernel.renderCount).toBe(2);
  });

  it('memakai hook default onMount/onDispose tanpa error', () => {
    const kernel = new MinimalKernel({ label: 'x', count: 1 });

    expect(() => kernel.mount(createHost())).not.toThrow();
    expect(() => kernel.dispose()).not.toThrow();
  });
});

describe('ComponentKernel — dispose', () => {
  it('membersihkan element, resource, dan idempoten', () => {
    const kernel = new TestKernel();
    kernel.mount(createHost());
    const resource = vi.fn();
    kernel.track(resource);

    kernel.dispose();
    kernel.dispose();

    expect(kernel.element).toBeNull();
    expect(kernel.mounted).toBe(false);
    expect(kernel.disposed).toBe(true);
    expect(kernel.disposeCount).toBe(1);
    expect(resource).toHaveBeenCalledTimes(1);
    expect(kernel.elementStub.remove).toHaveBeenCalledTimes(1);
  });

  it('pemakaian setelah dispose ditolak di mode development', () => {
    const kernel = new TestKernel();
    kernel.dispose();

    expect(() => kernel.option('label')).toThrowError(SimpleUIError);
    expect(() => kernel.repaint()).toThrowError(SimpleUIError);
    expect(() => kernel.mount(createHost())).toThrowError(SimpleUIError);
  });

  it('pemakaian setelah dispose menjadi no-op di production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const kernel = new TestKernel();
    kernel.dispose();

    expect(() => kernel.option('label')).not.toThrow();
    expect(kernel.option('label')).toBeUndefined();
    expect(() => kernel.repaint()).not.toThrow();
    expect(() => kernel.beginUpdate()).not.toThrow();
  });

  it('error saat dispose tetap membersihkan dan dilempar sebagai AggregateError', () => {
    const kernel = new TestKernel();
    kernel.mount(createHost());
    kernel.failDispose = true;

    expect(() => kernel.dispose()).toThrowError(AggregateError);
    expect(kernel.elementStub.remove).toHaveBeenCalledTimes(1);
    expect(kernel.element).toBeNull();
  });
});

describe('ComponentKernel — render error dan event', () => {
  it('error render dilempar ulang lewat onRenderError default', () => {
    const kernel = new TestKernel();
    kernel.failRender = true;

    expect(() => kernel.mount(createHost())).toThrowError('render gagal');
  });

  it('meneruskan event ke listener', () => {
    const kernel = new TestKernel();
    const listener = vi.fn();

    kernel.on('valueChanged', listener);
    kernel.fire(7);

    expect(listener).toHaveBeenCalledWith({ value: 7 });
    expect(kernel.activeListeners()).toBe(1);

    kernel.off('valueChanged', listener);
    expect(kernel.activeListeners()).toBe(0);
  });
});

describe('ComponentKernel — resource gagal dibersihkan', () => {
  it('kegagalan satu resource tidak menghentikan pembersihan lain', () => {
    const kernel = new TestKernel();
    kernel.mount(createHost());

    const healthy = vi.fn();
    kernel.track(() => {
      throw new Error('gagal bersih');
    });
    kernel.track(healthy);

    expect(() => kernel.dispose()).toThrowError(AggregateError);
    expect(healthy).toHaveBeenCalledTimes(1);
    expect(kernel.elementStub.remove).toHaveBeenCalledTimes(1);
  });
});
