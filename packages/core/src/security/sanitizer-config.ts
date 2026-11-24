/** Bentuk konfigurasi sanitizer. */
export interface SanitizerConfig {
  readonly allowedTags: readonly string[];
  readonly allowedAttributes: readonly string[];
  readonly allowedProtocols: readonly string[];
}

/** Allowlist sanitizer yang tidak dapat dilonggarkan consumer (docs/05 §3.2). */
export const SANITIZER_CONFIG = {
  allowedTags: [
    'b',
    'i',
    'em',
    'strong',
    'u',
    's',
    'br',
    'span',
    'a',
    'ul',
    'ol',
    'li',
    'p',
    'code',
    'pre',
  ],
  allowedAttributes: ['href', 'title', 'target', 'rel', 'class'],
  allowedProtocols: ['https:', 'http:', 'mailto:', 'tel:'],
} as const;

export const ALLOWED_TAGS = new Set<string>(SANITIZER_CONFIG.allowedTags);
export const ALLOWED_ATTRIBUTES = new Set<string>(
  SANITIZER_CONFIG.allowedAttributes,
);

/** Class dari data hanya boleh berprefix `sui-`. */
export const SUI_CLASS = /^sui-[a-z0-9-]+$/;
