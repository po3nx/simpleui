/**
 * Browser environment detection. Import-safe in Node/SSR: no top-level DOM
 * access is performed.
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Throws when a browser-only feature is used outside a browser. Callers must
 * not use this for import-time checks.
 */
export function assertBrowser(feature: string): void {
  if (!isBrowser()) {
    throw new Error(`[SimpleUI] ${feature} requires a browser environment`);
  }
}
