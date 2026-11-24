#!/usr/bin/env node
/**
 * Build paket tema (FND-010).
 *
 * Memakai Lightning CSS untuk membundel @import, meminifikasi, dan menghasilkan
 * source map (ADR-0010 §2). Output deterministik: tidak ada timestamp di dalam
 * berkas.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from 'lightningcss';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'packages', 'theme', 'src');
const OUT = path.join(ROOT, 'packages', 'theme', 'dist');

/** Target browser mengikuti ADR-0006: browser modern, ES2022. */
const TARGETS = {
  chrome: 111 << 16,
  firefox: 111 << 16,
  safari: 16 << 16,
  edge: 111 << 16,
};

const ENTRIES = ['index.css', 'tokens.css'];

await mkdir(OUT, { recursive: true });

for (const entry of ENTRIES) {
  const { code, map } = bundle({
    filename: path.join(SRC, entry),
    minify: true,
    sourceMap: true,
    targets: TARGETS,
  });

  await writeFile(path.join(OUT, entry), code);
  if (map) await writeFile(path.join(OUT, `${entry}.map`), map);

  const kib = (code.byteLength / 1024).toFixed(2);
  console.log(`theme: ${entry} -> dist/${entry} (${kib} KiB)`);
}

// Pastikan source asli tidak ikut berubah saat build (mis. @import salah tulis).
const entrySource = await readFile(path.join(SRC, 'index.css'), 'utf8');
if (!entrySource.includes('@layer simpleui.reset')) {
  console.error('theme: urutan layer tidak ditemukan di src/index.css');
  process.exit(1);
}
