import { DataError, isDataError } from './errors.js';

/** Timeout + pembatalan untuk operasi data (docs/03-data-layer.md §6.4). */
export interface TimeoutSignal {
  readonly signal: AbortSignal;
  readonly timedOut: boolean;
  dispose(): void;
}

export const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Buat signal dengan batas waktu yang juga mengikuti signal induk.
 * Timeout menghasilkan `SUI-DATA-004`, pembatalan induk `SUI-DATA-005`.
 */
export function createTimeoutSignal(
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  parent?: AbortSignal,
): TimeoutSignal {
  const controller = new AbortController();
  let timedOut = false;

  const onParentAbort = (): void => {
    controller.abort(
      new DataError('SUI-DATA-005', 'Permintaan dibatalkan.', {
        cause: parent?.reason,
      }),
    );
  };

  if (parent) {
    if (parent.aborted) onParentAbort();
    else parent.addEventListener('abort', onParentAbort, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(
      new DataError('SUI-DATA-004', `Timeout setelah ${timeoutMs} ms.`, {
        retryable: true,
      }),
    );
  }, timeoutMs);

  return {
    signal: controller.signal,
    get timedOut() {
      return timedOut;
    },
    dispose() {
      clearTimeout(timer);
      parent?.removeEventListener('abort', onParentAbort);
    },
  };
}

/** Lempar `DataError` bila signal sudah dibatalkan. */
export function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;

  if (isDataError(signal.reason)) throw signal.reason;
  throw new DataError('SUI-DATA-005', 'Permintaan dibatalkan.', {
    cause: signal.reason,
  });
}
