import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '../../src/security/sanitizer.js';

/** XSS corpus untuk sanitizer DOM nyata (docs/05 §3.2). */
describe('sanitizeHtml — DOM nyata', () => {
  it('membuang elemen berbahaya beserta isinya', () => {
    const output = sanitizeHtml(
      '<script>alert(1)</script><iframe src="https://evil"></iframe>' +
        '<img src=x onerror="alert(1)"><b>aman</b>',
    );

    expect(output).not.toContain('script');
    expect(output).not.toContain('iframe');
    expect(output).not.toContain('img');
    expect(output).not.toContain('onerror');
    expect(output).toContain('<b>aman</b>');
  });

  it('menghapus event handler dan membatasi class', () => {
    const output = sanitizeHtml(
      '<span onclick="alert(1)" class="sui-cell evil">teks</span>',
    );

    expect(output).not.toContain('onclick');
    expect(output).toContain('class="sui-cell"');
    expect(output).not.toContain('evil');
  });

  it('membuang href javascript: dan mempertahankan URL aman', () => {
    const unsafe = sanitizeHtml('<a href="javascript:alert(1)">klik</a>');
    expect(unsafe).not.toContain('href');

    const safe = sanitizeHtml('<a href="https://simpleui.dev">klik</a>');
    expect(safe).toContain('href="https://simpleui.dev/"');
  });

  it('menambahkan rel noopener untuk target _blank', () => {
    const output = sanitizeHtml(
      '<a href="https://simpleui.dev" target="_blank">buka</a>',
    );

    expect(output).toContain('rel="noopener noreferrer"');
  });

  it('mempertahankan tag allowlist dan teks', () => {
    const output = sanitizeHtml('<p>Halo <strong>dunia</strong></p>');

    expect(output).toBe('<p>Halo <strong>dunia</strong></p>');
  });

  it('meng-escape entitas berbahaya di teks', () => {
    const output = sanitizeHtml('<p>&lt;script&gt;</p>');

    expect(output).toContain('&lt;script&gt;');
    expect(output).not.toContain('<script>');
  });
});
