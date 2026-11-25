import { createElement, setAttributes } from '@simpleui/core';

/**
 * State loading/empty/error/no-data DataGrid (DG-036). Overlay tidak menghapus
 * baris lama, sehingga refresh tidak membuat grid berkedip kosong.
 */

export type GridStatusKind = 'loading' | 'empty' | 'no-data' | 'error';

export interface GridStatusOptions {
  readonly message?: string;
  readonly retryable?: boolean;
  readonly onRetry?: (() => void) | undefined;
}

export interface StatusView {
  readonly element: HTMLElement;
  show(kind: GridStatusKind, options?: GridStatusOptions): void;
  hide(): void;
  dispose(): void;
}

export const DEFAULT_STATUS_MESSAGES: Readonly<Record<string, string>> = {
  loading: 'Memuat data…',
  empty: 'Tidak ada data yang cocok dengan filter.',
  noData: 'Tidak ada data.',
  error: 'Gagal memuat data.',
  retry: 'Coba lagi',
};

export interface StatusViewOptions {
  readonly messages?: Readonly<Record<string, string>> | undefined;
  readonly onRetry?: (() => void) | undefined;
}

function appendMessage(element: HTMLElement, message: string): void {
  element.append(
    createElement('p', {
      className: 'sui-grid__status-message',
      text: message,
    }),
  );
}

function appendRetry(
  element: HTMLElement,
  label: string,
  handler: (() => void) | undefined,
): void {
  if (!handler) return;
  const retry = createElement('button', {
    className: 'sui-grid__retry',
    text: label,
  });
  setAttributes(retry, { type: 'button' });
  retry.addEventListener('click', handler);
  element.append(retry);
}

export function createStatusView(options: StatusViewOptions = {}): StatusView {
  const messages = { ...DEFAULT_STATUS_MESSAGES, ...options.messages };
  const element = createElement('div', { className: 'sui-grid__status' });
  element.hidden = true;

  return {
    element,

    show(kind, statusOptions = {}) {
      const message =
        statusOptions.message ??
        messages[kind === 'no-data' ? 'noData' : kind] ??
        '';
      const isError = kind === 'error';
      element.hidden = false;
      element.replaceChildren();

      element.className = `sui-grid__status sui-grid__status--${kind}`;
      setAttributes(element, {
        role: isError ? 'alert' : 'status',
        'aria-live': isError ? 'assertive' : 'polite',
        'data-status': kind,
      });

      if (kind === 'loading') {
        const spinner = createElement('span', {
          className: 'sui-grid__spinner',
        });
        setAttributes(spinner, { 'aria-hidden': 'true' });
        element.append(spinner);
      }

      appendMessage(element, message);

      if (isError && statusOptions.retryable) {
        appendRetry(
          element,
          messages['retry'] ?? 'Coba lagi',
          statusOptions.onRetry ?? options.onRetry,
        );
      }
    },

    hide() {
      element.hidden = true;
      element.replaceChildren();
      element.removeAttribute('data-status');
      element.removeAttribute('role');
      element.removeAttribute('aria-live');
    },

    dispose() {
      element.remove();
    },
  };
}
