import { describe, expect, it } from 'vitest';
import {
  classNames,
  createElement,
  getScrollParent,
  scrollIntoViewIfNeeded,
  setAttributes,
  setStyle,
  setStyles,
  toggleClass,
} from '../../src/dom/dom.js';
import { SimpleUIError } from '../../src/kernel/errors.js';

/**
 * Utilitas DOM diuji di Chromium nyata (ADR-0009): layout, scroll, dan CSSOM
 * tidak dapat dipercaya di emulasi.
 */
describe('createElement', () => {
  it('membuat element dengan kelas, atribut, dan teks', () => {
    const element = createElement('button', {
      className: 'sui-button',
      attrs: { type: 'button', 'data-id': 7, disabled: false },
      text: 'Simpan',
    });

    expect(element.tagName).toBe('BUTTON');
    expect(element.className).toBe('sui-button');
    expect(element.getAttribute('type')).toBe('button');
    expect(element.getAttribute('data-id')).toBe('7');
    expect(element.hasAttribute('disabled')).toBe(false);
    expect(element.textContent).toBe('Simpan');
  });

  it('memperlakukan teks sebagai teks, bukan HTML', () => {
    const element = createElement('div', { text: '<b>tebal</b>' });

    expect(element.textContent).toBe('<b>tebal</b>');
    expect(element.querySelector('b')).toBeNull();
  });

  it('menambahkan anak yang diberikan', () => {
    const child = createElement('span', { text: 'anak' });
    const parent = createElement('div', { children: [child] });

    expect(parent.firstElementChild).toBe(child);
  });
});

describe('setAttributes', () => {
  it('menghapus atribut untuk nilai null dan false', () => {
    const element = createElement('input', { attrs: { required: true } });

    setAttributes(element, { required: null, 'aria-label': 'nama' });

    expect(element.hasAttribute('required')).toBe(false);
    expect(element.getAttribute('aria-label')).toBe('nama');
  });

  it('menolak event handler on*', () => {
    const element = createElement('div');

    expect(() => setAttributes(element, { onclick: 'alert(1)' })).toThrowError(
      SimpleUIError,
    );
  });

  it('menolak URL javascript:', () => {
    const element = createElement('a');

    expect(() =>
      setAttributes(element, { href: 'javascript:alert(1)' }),
    ).toThrowError(SimpleUIError);
    expect(element.hasAttribute('href')).toBe(false);
  });
});

describe('classNames dan toggleClass', () => {
  it('menggabungkan kelas dan mengabaikan nilai kosong', () => {
    expect(classNames('sui-a', false, null, undefined, 'sui-b')).toBe(
      'sui-a sui-b',
    );
  });

  it('menambah dan melepas kelas tanpa menyentuh kelas lain', () => {
    const element = createElement('div', { className: 'base' });

    toggleClass(element, 'aktif', true);
    expect(element.className).toBe('base aktif');

    toggleClass(element, 'aktif', false);
    expect(element.className).toBe('base');
  });
});

describe('setStyle', () => {
  it('menulis custom property lewat CSSOM', () => {
    const element = createElement('div');

    setStyle(element, '--sui-grid-col-width', '120px');

    expect(element.style.getPropertyValue('--sui-grid-col-width')).toBe(
      '120px',
    );
  });

  it('menulis beberapa properti sekaligus', () => {
    const element = createElement('div');

    setStyles(element, { width: '80px', '--sui-row-height': '28px' });

    expect(element.style.width).toBe('80px');
    expect(element.style.getPropertyValue('--sui-row-height')).toBe('28px');
  });

  it('menolak penyelundupan properti', () => {
    const element = createElement('div');

    expect(() =>
      setStyle(element, 'color', 'red; background: black'),
    ).toThrowError(SimpleUIError);
    expect(() => setStyle(element, 'color:red;}', 'x')).toThrowError(
      SimpleUIError,
    );
  });
});

describe('getScrollParent', () => {
  it('menemukan leluhur yang dapat di-scroll', () => {
    const outer = createElement('div');
    outer.style.overflowY = 'auto';
    const inner = createElement('div');
    outer.append(inner);
    document.body.append(outer);

    expect(getScrollParent(inner)).toBe(outer);

    outer.remove();
  });

  it('mengembalikan null bila tidak ada leluhur yang scrollable', () => {
    const wrapper = createElement('div');
    wrapper.style.overflow = 'hidden';
    const inner = createElement('div');
    wrapper.append(inner);
    document.body.append(wrapper);

    expect(getScrollParent(inner)).toBeNull();

    wrapper.remove();
  });
});

describe('scrollIntoViewIfNeeded', () => {
  it('tidak melempar untuk element yang terpasang', () => {
    const element = createElement('div', { text: 'baris' });
    document.body.append(element);

    expect(() => scrollIntoViewIfNeeded(element)).not.toThrow();

    element.remove();
  });
});
