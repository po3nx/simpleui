import { SecurityError } from './errors.js';
import { sanitizeWithDom } from './sanitizer-dom.js';
import { SANITIZER_CONFIG } from './sanitizer-config.js';

/**
 * Facade sanitizer HTML (FND-022, docs/05-security.md §3.2).
 *
 * - Dipakai hanya jika consumer memilih `allowHtml`; default library memakai
 *   `textContent`, jadi tidak ada HTML sama sekali.
 * - Allowlist tetap dan tidak dapat dilonggarkan consumer.
 * - Tanpa DOM (SSR/Node) semua HTML di-escape — gagal tertutup.
 */

export { SANITIZER_CONFIG } from './sanitizer-config.js';

export interface SanitizerProvider {
  sanitize(html: string, config: typeof SANITIZER_CONFIG): string;
}

export interface Sanitizer {
  sanitize(html: string): string;
}

/** Escape semua karakter yang bermakna HTML. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Sanitasi HTML dengan allowlist tetap. Tanpa DOM, seluruh HTML di-escape.
 */
export function sanitizeHtml(html: string): string {
  if (typeof document === 'undefined') return escapeHtml(html);
  return sanitizeWithDom(html);
}

/**
 * Facade sanitizer. Bila `provider` diberikan (mis. DOMPurify), provider
 * menerima allowlist tetap dan tidak dapat melonggarkannya.
 */
export function createSanitizer(provider?: SanitizerProvider): Sanitizer {
  if (!provider) {
    return { sanitize: (html: string) => sanitizeHtml(html) };
  }

  return {
    sanitize(html: string): string {
      try {
        return provider.sanitize(html, SANITIZER_CONFIG);
      } catch (error) {
        throw new SecurityError(
          'SUI-SEC-002',
          'Sanitizer gagal memproses HTML.',
          { cause: error },
        );
      }
    },
  };
}
