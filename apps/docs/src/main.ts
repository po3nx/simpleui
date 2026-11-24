import '@simpleui/theme/styles.css';
import './style.css';

import { classNames, createElement, setAttributes } from '@simpleui/core';
import { mountVirtualList } from './demo/virtual-list.js';
import { renderMarkdown } from './markdown.js';
import { NAV_SECTIONS } from './nav.js';
import { findPage, resolveSlug } from './router.js';

const THEMES = ['light', 'dark', 'high-contrast'] as const;
const DENSITIES = ['comfortable', 'compact', 'spacious'] as const;

function createSelect(
  label: string,
  values: readonly string[],
  current: string,
  onChange: (value: string) => void,
): HTMLElement {
  const wrapper = createElement('label', { className: 'sui-docs-control' });
  wrapper.append(document.createTextNode(label));

  const select = createElement('select');
  setAttributes(select, { 'aria-label': label });

  for (const value of values) {
    const option = createElement('option', { text: value });
    setAttributes(option, { value });
    select.append(option);
  }
  select.value = current;

  select.addEventListener('change', () => {
    onChange(select.value);
  });

  wrapper.append(select);
  return wrapper;
}

function currentTheme(): string {
  return document.documentElement.dataset['theme'] ?? 'light';
}

function currentDensity(): string {
  return document.documentElement.dataset['density'] ?? 'comfortable';
}

function createHeader(): HTMLElement {
  const header = createElement('header', { className: 'sui-docs-header' });
  const brand = createElement('a', {
    className: 'sui-docs-brand',
    text: 'SimpleUI',
    attrs: { href: '#/pengantar' },
  });

  const controls = createElement('div', { className: 'sui-docs-controls' });
  controls.append(
    createSelect('Tema', THEMES, currentTheme(), (value) => {
      document.documentElement.dataset['theme'] = value;
    }),
    createSelect('Density', DENSITIES, currentDensity(), (value) => {
      document.documentElement.dataset['density'] = value;
    }),
  );

  header.append(brand, controls);
  return header;
}

function createSidebar(activeSlug: string): HTMLElement {
  const sidebar = createElement('nav', {
    className: 'sui-docs-sidebar',
    attrs: { 'aria-label': 'Navigasi dokumentasi' },
  });

  for (const section of NAV_SECTIONS) {
    sidebar.append(
      createElement('p', {
        className: 'sui-docs-section-title',
        text: section.title,
      }),
    );

    const list = createElement('ul', { className: 'sui-docs-nav' });
    for (const page of section.pages) {
      const active = page.slug === activeSlug;
      const link = createElement('a', {
        className: classNames('sui-docs-nav-link', active && 'is-active'),
        text: page.title,
        attrs: { href: `#/${page.slug}` },
      });
      if (active) setAttributes(link, { 'aria-current': 'page' });

      const item = createElement('li');
      item.append(link);
      list.append(item);
    }
    sidebar.append(list);
  }

  return sidebar;
}

function render(cleanup: () => void): () => void {
  const app = document.querySelector<HTMLElement>('#app');
  if (!app) throw new Error('Elemen #app tidak ditemukan');

  const slug = resolveSlug(window.location.hash, NAV_SECTIONS);
  const page = findPage(slug, NAV_SECTIONS);

  const content = createElement('main', { className: 'sui-docs-content' });
  const article = createElement('article', { className: 'sui-docs-article' });
  // HTML berasal dari renderMarkdown() yang sudah disanitasi allowlist.
  article.innerHTML = page
    ? renderMarkdown(page.markdown)
    : '<p>Halaman tidak ditemukan.</p>';
  content.append(article);

  let stopDemo: (() => void) | null = null;
  if (slug === 'contoh') {
    const demo = createElement('section', { className: 'sui-docs-demo' });
    content.append(demo);
    stopDemo = mountVirtualList(demo);
  }

  const layout = createElement('div', {
    className: 'sui-theme sui-docs-layout',
  });
  layout.append(createHeader(), createSidebar(slug), content);
  app.replaceChildren(layout);

  cleanup();
  return stopDemo ?? (() => {});
}

function mount(): void {
  if (!window.location.hash) window.location.hash = '#/pengantar';

  let cleanup: () => void = () => {};
  const rerender = (): void => {
    cleanup = render(cleanup);
  };

  window.addEventListener('hashchange', rerender);
  rerender();
}

mount();
