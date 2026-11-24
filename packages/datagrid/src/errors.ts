import { SimpleUIError } from '@simpleui/core';

import type { DataGridErrorCode } from './api/types.js';

/** Error DataGrid dengan kode stabil `SUI-DG-001…010`. */
export class DataGridError extends SimpleUIError<DataGridErrorCode> {
  readonly path: string | undefined;

  constructor(
    code: DataGridErrorCode,
    message: string,
    options: ErrorOptions & { path?: string } = {},
  ) {
    super(code, message, options);
    this.path = options.path;
  }
}

export function isDataGridError(error: unknown): error is DataGridError {
  return error instanceof DataGridError;
}
