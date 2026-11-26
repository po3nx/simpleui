/**
 * Column resize DataGrid (DG-037): pointer drag + keyboard, clamp min/max.
 */

export const RESIZE_STEP = 10;

export interface ColumnResizeOptions {
  readonly handle: HTMLElement;
  readonly initialWidth: number;
  readonly minWidth: number;
  readonly maxWidth?: number | undefined;
  readonly onPreview: (width: number) => void;
  readonly onCommit: (width: number) => void;
  readonly step?: number;
  readonly rtl?: boolean | undefined;
}

export function clampColumnWidth(
  width: number,
  minWidth: number,
  maxWidth = Number.POSITIVE_INFINITY,
): number {
  return Math.min(maxWidth, Math.max(minWidth, Math.round(width)));
}

/** Pasang interaksi resize; mengembalikan fungsi pelepasan listener. */
export function attachColumnResize(options: ColumnResizeOptions): () => void {
  const min = options.minWidth;
  const max = options.maxWidth ?? Number.POSITIVE_INFINITY;
  const step = options.step ?? RESIZE_STEP;
  let current = clampColumnWidth(options.initialWidth, min, max);
  let startX = 0;
  let startWidth = current;
  let dragging = false;
  const direction = options.rtl ? -1 : 1;

  const moveTo = (width: number): void => {
    current = clampColumnWidth(width, min, max);
    options.onPreview(current);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    startWidth = current;
    try {
      options.handle.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture tidak wajib; listener window tetap bekerja.
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!dragging) return;
    moveTo(startWidth + direction * (event.clientX - startX));
  };

  const onPointerUp = (): void => {
    if (!dragging) return;
    dragging = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    options.onCommit(current);
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = (event.key === 'ArrowRight' ? step : -step) * direction;
    moveTo(current + delta);
    options.onCommit(current);
  };

  options.handle.addEventListener('pointerdown', onPointerDown);
  options.handle.addEventListener('keydown', onKeyDown);

  return () => {
    dragging = false;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    options.handle.removeEventListener('pointerdown', onPointerDown);
    options.handle.removeEventListener('keydown', onKeyDown);
  };
}
