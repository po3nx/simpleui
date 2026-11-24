/**
 * Kesalahan runtime SimpleUI dengan kode stabil untuk diprogram consumer.
 *
 * Kode `SUI-CORE-*` dipakai oleh kernel:
 * - `SUI-CORE-001` — opsi tidak dikenal atau nilai tidak valid.
 * - `SUI-CORE-002` — method dipanggil setelah `dispose()`.
 * - `SUI-CORE-003` — urutan lifecycle tidak sah (mis. `endUpdate` tanpa
 *   `beginUpdate`).
 * - `SUI-DOM-001` — atribut atau nilai style tidak aman (mis. handler `on*`
 *   atau URL `javascript:`).
 * - `SUI-I18N-001` — locale, timezone, atau mata uang tidak valid.
 */
export type CoreErrorCode =
  | 'SUI-CORE-001'
  | 'SUI-CORE-002'
  | 'SUI-CORE-003'
  | 'SUI-DOM-001'
  | 'SUI-I18N-001';

export class SimpleUIError extends Error {
  readonly code: CoreErrorCode;

  constructor(code: CoreErrorCode, message: string, options?: ErrorOptions) {
    super(`[${code}] ${message}`, options);
    this.name = 'SimpleUIError';
    this.code = code;
  }
}

/** Type guard agar consumer dapat membedakan error library dari error lain. */
export function isSimpleUIError(error: unknown): error is SimpleUIError {
  return error instanceof SimpleUIError;
}
