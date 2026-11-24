import { describe, expect, it, vi } from 'vitest';
import { SecurityError } from './errors.js';
import {
  createSanitizer,
  escapeHtml,
  SANITIZER_CONFIG,
  sanitizeHtml,
} from './sanitizer.js';

describe('escapeHtml', () => {
  it('meng-escape karakter bermakna HTML', () => {
    expect(escapeHtml('<b>"x" & \'y\'</b>')).toBe(
      '&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;',
    );
  });
});

describe('sanitizeHtml tanpa DOM', () => {
  it('gagal tertutup dengan meng-escape seluruh HTML', () => {
    expect(sanitizeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });
});

describe('createSanitizer', () => {
  it('memakai fallback bawaan tanpa provider', () => {
    const sanitizer = createSanitizer();
    expect(sanitizer.sanitize('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;');
  });

  it('meneruskan allowlist tetap ke provider', () => {
    const provider = { sanitize: vi.fn(() => '<b>ok</b>') };
    const sanitizer = createSanitizer(provider);

    expect(sanitizer.sanitize('<b>ok</b>')).toBe('<b>ok</b>');
    expect(provider.sanitize).toHaveBeenCalledWith(
      '<b>ok</b>',
      SANITIZER_CONFIG,
    );
  });

  it('membungkus kegagalan provider sebagai SUI-SEC-002', () => {
    const sanitizer = createSanitizer({
      sanitize: () => {
        throw new Error('gagal');
      },
    });

    try {
      sanitizer.sanitize('<b>x</b>');
      expect.unreachable('harus melempar');
    } catch (error) {
      expect(error).toBeInstanceOf(SecurityError);
      expect((error as SecurityError).code).toBe('SUI-SEC-002');
    }
  });
});
