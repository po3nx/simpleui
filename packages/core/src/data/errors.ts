import { SimpleUIError } from '../kernel/errors.js';

/** Kode error data layer (docs/03-data-layer.md §9). */
export type DataErrorCode =
  | 'SUI-DATA-001'
  | 'SUI-DATA-002'
  | 'SUI-DATA-003'
  | 'SUI-DATA-004'
  | 'SUI-DATA-005'
  | 'SUI-DATA-006'
  | 'SUI-DATA-007'
  | 'SUI-DATA-008'
  | 'SUI-DATA-009'
  | 'SUI-DATA-010';

export interface DataErrorOptions {
  cause?: unknown;
  /** Konteks tersanitasi (tanpa token/PII). */
  context?: Readonly<Record<string, unknown>>;
  retryable?: boolean;
}

export class DataError extends SimpleUIError<DataErrorCode> {
  readonly context: Readonly<Record<string, unknown>> | undefined;
  readonly retryable: boolean;

  constructor(
    code: DataErrorCode,
    message: string,
    options: DataErrorOptions = {},
  ) {
    super(
      code,
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.context = options.context;
    this.retryable = options.retryable ?? false;
  }
}

export function isDataError(error: unknown): error is DataError {
  return error instanceof DataError;
}

/** Normalisasi error asing menjadi `DataError` tanpa membocorkan detail internal. */
export function toDataError(
  error: unknown,
  code: DataErrorCode,
  message: string,
  options: DataErrorOptions = {},
): DataError {
  if (isDataError(error)) return error;
  return new DataError(code, message, { ...options, cause: error });
}
