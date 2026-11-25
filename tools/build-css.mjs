#!/usr/bin/env node
/**
 * Build CSS paket komponen dengan Lightning CSS (ADR-0010).
 *
 * Pemakaian:
 *   node tools/build-css.mjs --in src/styles/grid.css --out dist/styles.css
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { bundle } from 'lightningcss';

// Path relatif terhadap direktori kerja paket (dijalankan lewat `pnpm build`).
const ROOT = process.cwd();

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const input = argument('--in');
const output = argument('--out');
if (!input || !output) {
  console.error(
    'Pemakaian: node tools/build-css.mjs --in <src.css> --out <dist.css>',
  );
  process.exit(2);
}

const targets = {
  chrome: 111 << 16,
  firefox: 111 << 16,
  safari: 16 << 16,
  edge: 111 << 16,
};

const { code, map } = bundle({
  filename: path.resolve(ROOT, input),
  minify: true,
  sourceMap: true,
  targets,
});

const outputPath = path.resolve(ROOT, output);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, code);
if (map) await writeFile(`${outputPath}.map`, map);

console.log(
  `css: ${input} -> ${output} (${(code.byteLength / 1024).toFixed(2)} KiB)`,
);
