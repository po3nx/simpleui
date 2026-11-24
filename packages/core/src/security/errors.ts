import { SimpleUIError } from '../kernel/errors.js';

export type SecurityErrorCode = 'SUI-SEC-001' | 'SUI-SEC-002';

/** Error keamanan dengan kode stabil. */
export class SecurityError extends SimpleUIError<SecurityErrorCode> {}

export function isSecurityError(error: unknown): error is SecurityError {
  return error instanceof SecurityError;
}
