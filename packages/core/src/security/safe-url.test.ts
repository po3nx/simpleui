import { describe, expect, it } from 'vitest';
import {
  ALLOWED_PROTOCOLS,
  isSafeUrl,
  safeImageUrl,
  safeUrl,
} from './safe-url.js';

const BASE = 'https://simpleui.dev/docs/page';

describe('safeUrl', () => {
  it('menerima protokol yang diizinkan', () => {
    expect(safeUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(safeUrl('http://localhost:3000')).toBe('http://localhost:3000/');
    expect(safeUrl('mailto:halo@simpleui.dev')).toBe(
      'mailto:halo@simpleui.dev',
    );
    expect(safeUrl('tel:+628123')).toBe('tel:+628123');
  });

  it('menyelesaikan URL relatif dengan base', () => {
    expect(safeUrl('/admin', BASE)).toBe('https://simpleui.dev/admin');
    expect(safeUrl('//evil.com', BASE)).toBe('https://evil.com/');
  });

  it('menolak protokol berbahaya dan data/blob', () => {
    for (const value of [
      'javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'blob:https://example.com/abc',
      'ftp://example.com/file',
      'file:///etc/passwd',
    ]) {
      expect(safeUrl(value, BASE)).toBeNull();
    }
  });

  it('menolak karakter kontrol dan spasi baru', () => {
    expect(safeUrl('java\tscript:alert(1)', BASE)).toBeNull();
    expect(safeUrl('https://example.com/\nalert', BASE)).toBeNull();
    expect(safeUrl('', BASE)).toBeNull();
  });

  it('menolak URL dengan userinfo yang menyesatkan', () => {
    expect(safeUrl('https://trusted.com@evil.com', BASE)).toBeNull();
    expect(safeUrl('https://user:pass@example.com', BASE)).toBeNull();
  });
});

describe('safeImageUrl', () => {
  it('mengizinkan data:image dan blob', () => {
    expect(safeImageUrl('data:image/png;base64,AAAA')).toBe(
      'data:image/png;base64,AAAA',
    );
    expect(safeImageUrl('blob:https://simpleui.dev/abc')).toBe(
      'blob:https://simpleui.dev/abc',
    );
  });

  it('menolak data non-gambar dan javascript', () => {
    expect(safeImageUrl('data:text/html;base64,AAAA')).toBeNull();
    expect(safeImageUrl('javascript:alert(1)')).toBeNull();
  });
});

describe('isSafeUrl', () => {
  it('mengembalikan boolean sesuai safeUrl', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect([...ALLOWED_PROTOCOLS]).toEqual([
      'https:',
      'http:',
      'mailto:',
      'tel:',
    ]);
  });
});
