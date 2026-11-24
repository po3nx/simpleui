import { describe, expect, it } from 'vitest';
import {
  createTemplateBridge,
  type TemplateContext,
} from '../../src/template/template.js';
import { createElement } from '../../src/dom/dom.js';

interface Row {
  name: string;
}

function context(name: string): TemplateContext<Row> {
  return { data: { name }, index: 0, value: name };
}

describe('TemplateBridge — DOM nyata', () => {
  it('cellTemplate vanilla menulis teks tanpa HTML', () => {
    const cell = createElement('div');
    const bridge = createTemplateBridge<Row>((container, { data }) => {
      container.textContent = data.name;
    });

    const handle = bridge.createHandle(cell, context('<b>Ani</b>'));

    expect(cell.textContent).toBe('<b>Ani</b>');
    expect(cell.querySelector('b')).toBeNull();

    handle.dispose();
    expect(cell.textContent).toBe('');
    bridge.dispose();
  });

  it('update mengganti isi container dan fokus tidak tertinggal', () => {
    const cell = createElement('div');
    const button = createElement('button', { text: 'lama' });
    cell.append(button);

    const bridge = createTemplateBridge<Row>((container, { data }) => {
      const next = createElement('button', { text: data.name });
      container.append(next);
    });

    const handle = bridge.createHandle(cell, context('baru'));
    handle.update(context('lebih baru'));

    expect(cell.querySelectorAll('button')).toHaveLength(1);
    expect(cell.textContent).toBe('lebih baru');

    handle.dispose();
    bridge.dispose();
  });

  it('handle dari adapter memakai element nyata dan dibersihkan', () => {
    const host = createElement('div');
    const bridge = createTemplateBridge<Row>((container, { data }) => {
      const element = createElement('span', { text: data.name });
      container.append(element);
      return {
        update: (next) => {
          element.textContent = String(next.data.name);
        },
        dispose: () => {
          element.remove();
        },
      };
    });

    const handle = bridge.createHandle(host, context('pertama'));
    expect(host.textContent).toBe('pertama');

    handle.update(context('kedua'));
    expect(host.textContent).toBe('kedua');

    handle.dispose();
    expect(host.childElementCount).toBe(0);
    bridge.dispose();
  });
});
