#!/usr/bin/env node
/**
 * Benchmark virtualizer untuk 100.000 baris (FND-019, R-PERF-07).
 *
 * Mengukur biaya satu pembaruan scroll; target budget frame 16 ms (60 fps).
 * Jalankan setelah build: `pnpm bench:virtualizer`.
 */

import { performance } from 'node:perf_hooks';
import { Virtualizer } from '../packages/core/dist/view/virtualizer.js';

const ROWS = 100_000;
const ITEM_SIZE = 32;
const VIEWPORT = 800;
const ITERATIONS = 200_000;
const MAX_OFFSET = ROWS * ITEM_SIZE - VIEWPORT;

const virtualizer = new Virtualizer({
  itemCount: ROWS,
  itemSize: ITEM_SIZE,
  viewportSize: VIEWPORT,
});

// Pemanasan agar JIT tidak mengukur dirinya sendiri.
for (let index = 0; index < 5_000; index += 1) {
  virtualizer.setScrollOffset((index * 97) % MAX_OFFSET);
}

let checksum = 0;
const started = performance.now();

for (let index = 0; index < ITERATIONS; index += 1) {
  virtualizer.setScrollOffset((index * 97) % MAX_OFFSET);
  checksum += virtualizer.range.start;
}

const elapsed = performance.now() - started;
const microsecondsPerUpdate = (elapsed / ITERATIONS) * 1000;
const updatesPerFrame = Math.floor(16_000 / microsecondsPerUpdate);

console.log(
  `virtualizer 100k: ${ITERATIONS.toLocaleString('en-US')} update dalam ${elapsed.toFixed(0)} ms`,
);
console.log(`  ${microsecondsPerUpdate.toFixed(2)} µs/update`);
console.log(
  `  ~${updatesPerFrame.toLocaleString('en-US')} update per frame 16 ms`,
);
console.log(`  checksum ${checksum}`);

if (microsecondsPerUpdate > 1000) {
  console.error(
    'GAGAL: satu update melebihi 1 ms (jauh di atas budget frame).',
  );
  process.exit(1);
}
