import { describe, expect, it } from 'vitest';
import { createElement, setStyle } from '../../src/dom/dom.js';
import { Virtualizer } from '../../src/view/virtualizer.js';

/**
 * Bukti kriteria G1: 100.000 baris tetap dalam budget frame 16 ms **di DOM
 * nyata**, bukan hanya matematika virtualizer (FND-019).
 *
 * Yang diukur adalah pekerjaan main thread per frame: hitung rentang + tulis
 * ~30 baris DOM + baca layout. Angka ini yang menentukan apakah scroll dapat
 * bertahan 60 fps; refresh display itu sendiri ditangani browser.
 */

const ROWS = 100_000;
const ROW_HEIGHT = 32;
const VIEWPORT = 600;
const FRAMES = 120;

function createDom() {
  const viewport = createElement('div');
  setStyle(viewport, 'block-size', `${VIEWPORT}px`);
  setStyle(viewport, 'overflow', 'auto');

  const spacer = createElement('div');
  setStyle(spacer, 'position', 'relative');
  setStyle(spacer, 'block-size', `${ROWS * ROW_HEIGHT}px`);

  const windowElement = createElement('div');
  setStyle(windowElement, 'position', 'absolute');
  setStyle(windowElement, 'inset-inline', '0');
  setStyle(windowElement, 'top', '0');

  spacer.append(windowElement);
  viewport.append(spacer);
  document.body.append(viewport);

  return { viewport, windowElement };
}

function renderWindow(
  windowElement: HTMLElement,
  virtualizer: Virtualizer,
): void {
  const { start, end, offsetTop } = virtualizer.range;
  setStyle(windowElement, 'transform', `translateY(${offsetTop}px)`);

  const rows: HTMLElement[] = [];
  for (let index = start; index < end; index += 1) {
    const row = createElement('div');
    setStyle(row, 'block-size', `${ROW_HEIGHT}px`);
    row.textContent = `Baris ${index + 1}`;
    rows.push(row);
  }
  windowElement.replaceChildren(...rows);
}

function percentile(sorted: readonly number[], ratio: number): number {
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] ?? 0
  );
}

describe('Virtualizer — frame nyata 100k baris', () => {
  it('mempertahankan budget 16 ms per frame saat scroll', async () => {
    const { viewport, windowElement } = createDom();
    const virtualizer = new Virtualizer({
      itemCount: ROWS,
      itemSize: ROW_HEIGHT,
      viewportSize: VIEWPORT,
    });
    renderWindow(windowElement, virtualizer);

    const samples: number[] = [];
    const maxOffset = ROWS * ROW_HEIGHT - VIEWPORT;

    for (let frame = 0; frame < FRAMES; frame += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const started = performance.now();
      virtualizer.setScrollOffset((frame * 400) % maxOffset);
      renderWindow(windowElement, virtualizer);
      // Paksa layout agar biaya write + layout ikut terukur.
      void windowElement.offsetHeight;
      samples.push(performance.now() - started);
    }

    const sorted = [...samples].sort((first, second) => first - second);
    const median = percentile(sorted, 0.5);
    const p95 = percentile(sorted, 0.95);

    console.log(
      `virtualizer frame 100k: median ${median.toFixed(2)} ms, p95 ${p95.toFixed(2)} ms, maks ${(sorted.at(-1) ?? 0).toFixed(2)} ms`,
    );

    expect(windowElement.childElementCount).toBeLessThanOrEqual(40);
    expect(median).toBeLessThan(8);
    expect(p95).toBeLessThan(16);

    viewport.remove();
  });
});
