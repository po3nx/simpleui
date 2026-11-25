import { isDataError, type DataError } from '@simpleui/core';

import type { DataGridErrorCode } from '../api/types.js';
import { DataGridError } from '../errors.js';

/**
 * Klasifikasi error DataGrid (DG-023): kode stabil, pesan aman untuk pengguna,
 * dan penanda retryable. Detail internal tidak pernah ditampilkan.
 */

export interface GridErrorInfo {
  readonly code: DataGridErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly cause: unknown;
}

export const DEFAULT_ERROR_MESSAGES: Readonly<
  Record<DataGridErrorCode, string>
> = {
  'SUI-DG-001': 'Opsi atau filter tidak valid.',
  'SUI-DG-002': 'Data memiliki nilai unik yang duplikat.',
  'SUI-DG-003': 'Kolom kunci tidak ditemukan pada data.',
  'SUI-DG-004': 'Gagal memuat data. Coba lagi.',
  'SUI-DG-005': 'Data telah berubah di server. Muat ulang lalu coba lagi.',
  'SUI-DG-006': 'Template gagal dirender.',
  'SUI-DG-007': 'Ekspor gagal.',
  'SUI-DG-008': 'State tersimpan tidak valid dan diabaikan.',
  'SUI-DG-009': 'Operasi tidak didukung.',
  'SUI-DG-010': 'Grid sudah dibuang.',
};

const RETRYABLE = new Set<DataGridErrorCode>(['SUI-DG-004', 'SUI-DG-007']);

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: string }).name === 'AbortError'
  );
}

function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const record = error as { status?: unknown; cause?: unknown };
  if (typeof record.status === 'number') return record.status;
  const cause = record.cause;
  if (typeof cause === 'object' && cause !== null) {
    const status = (cause as { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return undefined;
}

function codeForDataError(error: DataError): DataGridErrorCode {
  if (statusOf(error) === 409) return 'SUI-DG-005';
  return 'SUI-DG-004';
}

export function classifyError(error: unknown): {
  readonly code: DataGridErrorCode;
  readonly cause: unknown;
} {
  if (error instanceof DataGridError) {
    return { code: error.code, cause: error.cause ?? undefined };
  }
  if (isDataError(error)) {
    return { code: codeForDataError(error), cause: error };
  }
  if (statusOf(error) === 409) {
    return { code: 'SUI-DG-005', cause: error };
  }
  return { code: 'SUI-DG-004', cause: error };
}

/** Ubah error apa pun menjadi DataGridError dengan pesan aman. */
export function toGridError(error: unknown): DataGridError {
  if (error instanceof DataGridError) return error;
  const { code, cause } = classifyError(error);
  return new DataGridError(code, DEFAULT_ERROR_MESSAGES[code], {
    cause,
  });
}

/** Deskripsi siap tampil; pesan dapat dioverride lewat `messages`. */
export function describeGridError(
  error: unknown,
  messages?: Readonly<Record<string, string>>,
): GridErrorInfo {
  const { code, cause } = classifyError(error);
  return {
    code,
    message: messages?.[code] ?? DEFAULT_ERROR_MESSAGES[code],
    retryable: RETRYABLE.has(code),
    cause: messageCause(cause),
  };
}

function messageCause(cause: unknown): unknown {
  // Cause tidak dimasukkan ke pesan; hanya diteruskan untuk logging internal.
  return cause;
}

export function isRetryable(error: unknown): boolean {
  return RETRYABLE.has(classifyError(error).code);
}
