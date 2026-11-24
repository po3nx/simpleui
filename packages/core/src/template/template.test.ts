import { describe, expect, it, vi } from 'vitest';
import {
  createTemplateBridge,
  type TemplateContext,
  type TemplateHandle,
} from './template.js';

interface Row {
  name: string;
}

function context(index = 0): TemplateContext<Row> {
  return { data: { name: 'Ani' }, index, value: 'Ani' };
}

function fakeContainer() {
  const children: string[] = [];
  return {
    children,
    replaceChildren: () => {
      children.length = 0;
    },
    append: (value: string) => children.push(value),
  } as unknown as HTMLElement & { children: string[] };
}

function fakeHandle(): TemplateHandle & { updates: number; disposals: number } {
  const handle = {
    updates: 0,
    disposals: 0,
    update: () => {
      handle.updates += 1;
    },
    dispose: () => {
      handle.disposals += 1;
    },
  };
  return handle;
}

describe('TemplateBridge — template vanilla', () => {
  it('memanggil template saat render dan saat update', () => {
    const container = fakeContainer();
    const template = vi.fn((element: HTMLElement) => {
      element.textContent = 'isi';
    });
    const bridge = createTemplateBridge<Row>(template);

    const handle = bridge.createHandle(container, context());
    expect(template).toHaveBeenCalledTimes(1);

    handle.update(context(1));
    expect(template).toHaveBeenCalledTimes(2);
    expect(bridge.activeCount).toBe(1);

    handle.dispose();
    expect(bridge.activeCount).toBe(0);
  });

  it('membersihkan container sebelum update dan saat dispose', () => {
    const container = fakeContainer();
    container.children.push('sisa');
    const template = vi.fn((element: HTMLElement) => {
      element.append('baru');
    });
    const bridge = createTemplateBridge<Row>(template);

    const handle = bridge.createHandle(container, context());
    handle.update(context(1));
    expect(container.children).toEqual(['baru']);

    handle.dispose();
    expect(container.children).toEqual([]);
  });
});

describe('TemplateBridge — handle dari adapter', () => {
  it('meneruskan update dan dispose ke handle asli', () => {
    const original = fakeHandle();
    const bridge = createTemplateBridge<Row>(() => original);

    const handle = bridge.createHandle(fakeContainer(), context());
    handle.update(context(1));
    expect(original.updates).toBe(1);

    handle.dispose();
    handle.dispose();
    expect(original.disposals).toBe(1);
    expect(bridge.activeCount).toBe(0);
  });

  it('dispose bridge membersihkan seluruh handle', () => {
    const first = fakeHandle();
    const second = fakeHandle();
    let call = 0;
    const bridge = createTemplateBridge<Row>(() => {
      call += 1;
      return call === 1 ? first : second;
    });

    bridge.createHandle(fakeContainer(), context());
    bridge.createHandle(fakeContainer(), context(1));
    bridge.dispose();

    expect(first.disposals).toBe(1);
    expect(second.disposals).toBe(1);
    expect(bridge.activeCount).toBe(0);
    expect(bridge.disposed).toBe(true);
  });

  it('mengabaikan createHandle setelah dispose', () => {
    const template = vi.fn(() => fakeHandle());
    const bridge = createTemplateBridge<Row>(template);
    bridge.dispose();

    const handle = bridge.createHandle(fakeContainer(), context());
    handle.update(context(1));
    handle.dispose();

    expect(template).not.toHaveBeenCalled();
  });
});

describe('TemplateBridge — isolasi error (R-TPL-04)', () => {
  it('menangkap error render dan meneruskannya ke onError', () => {
    const onError = vi.fn();
    const bridge = createTemplateBridge<Row>(
      () => {
        throw new Error('template gagal');
      },
      { onError },
    );

    const handle = bridge.createHandle(fakeContainer(), context());

    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'render');
    expect(bridge.activeCount).toBe(0);
    expect(() => handle.update(context(1))).not.toThrow();
  });

  it('menangkap error update tanpa melempar', () => {
    const onError = vi.fn();
    const failing = {
      update: () => {
        throw new Error('update gagal');
      },
      dispose: () => {},
    };
    const bridge = createTemplateBridge<Row>(() => failing, { onError });

    const handle = bridge.createHandle(fakeContainer(), context());
    expect(() => handle.update(context(1))).not.toThrow();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'update');
  });

  it('menangkap error dispose dan tetap melepas handle', () => {
    const onError = vi.fn();
    const failing = {
      update: () => {},
      dispose: () => {
        throw new Error('dispose gagal');
      },
    };
    const bridge = createTemplateBridge<Row>(() => failing, { onError });
    const handle = bridge.createHandle(fakeContainer(), context());

    expect(() => handle.dispose()).not.toThrow();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'dispose');
    expect(bridge.activeCount).toBe(0);
  });
});
