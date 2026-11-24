/**
 * Validasi URL dari data tidak tepercaya (FND-022, docs/05-security.md §4.5).
 */

const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'mailto:', 'tel:']);
const IMAGE_EXTRA_PROTOCOLS = new Set(['data:', 'blob:']);
// eslint-disable-next-line no-control-regex -- sengaja mendeteksi karakter kontrol
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

function parse(value: string, base: string | undefined): URL | null {
  const raw = value.trim();
  if (!raw || CONTROL_CHARACTERS.test(raw)) return null;

  try {
    return new URL(raw, base ?? globalThis.location?.href);
  } catch {
    return null;
  }
}

/**
 * Kembalikan URL absolut yang aman, atau `null`.
 * Userinfo (`https://trusted@evil.com`) ditolak karena menyesatkan pengguna.
 */
export function safeUrl(value: string, base?: string): string | null {
  const url = parse(value, base);
  if (!url) return null;
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
  if (url.username || url.password) return null;
  return url.href;
}

/** Seperti `safeUrl`, tetapi mengizinkan `data:image/*` dan `blob:` untuk gambar. */
export function safeImageUrl(value: string, base?: string): string | null {
  const url = parse(value, base);
  if (!url) return null;
  if (url.username || url.password) return null;

  if (ALLOWED_PROTOCOLS.has(url.protocol)) return url.href;
  if (url.protocol === 'blob:') return url.href;
  if (url.protocol === 'data:' && url.href.startsWith('data:image/')) {
    return url.href;
  }

  return null;
}

/** True bila `safeUrl` menerima nilai tersebut. */
export function isSafeUrl(value: string, base?: string): boolean {
  return safeUrl(value, base) !== null;
}

export { ALLOWED_PROTOCOLS, IMAGE_EXTRA_PROTOCOLS };
