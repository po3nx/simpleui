import { sanitizeHtmlWithConfig, type SanitizerConfig } from '@simpleui/core';
import { marked } from 'marked';

/**
 * Allowlist khusus dokumentasi: lebih luas dari allowlist konten sel
 * (judul, tabel, kutipan) tetapi tetap tertutup.
 */
export const DOCS_SANITIZER_CONFIG: SanitizerConfig = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'p',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'code',
    'pre',
    'a',
    'br',
    'hr',
    'blockquote',
    'span',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
  ],
  allowedAttributes: ['href', 'title', 'target', 'rel', 'class', 'id'],
  allowedProtocols: ['https:', 'http:', 'mailto:', 'tel:'],
};

/** Render Markdown menjadi HTML tersanitasi (satu-satunya jalur HTML). */
export function renderMarkdown(markdown: string): string {
  const parsed = marked.parse(markdown, { async: false, gfm: true });
  const html = typeof parsed === 'string' ? parsed : String(parsed);
  return sanitizeHtmlWithConfig(html, DOCS_SANITIZER_CONFIG);
}
