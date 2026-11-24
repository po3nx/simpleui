#!/usr/bin/env node
/**
 * Menyalin `LICENSE` dan `NOTICE` dari root ke setiap paket (FND-025).
 *
 * npm/pnpm hanya menyertakan berkas lisensi yang berada di direktori paket,
 * sehingga salinan ini diperlukan agar tarball memuat lisensi paket.
 *
 * Pemakaian:
 *   node tools/sync-license.mjs           # tulis/segarkan salinan
 *   node tools/sync-license.mjs --check   # gagal bila salinan tidak sinkron
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const FILES = ['LICENSE', 'NOTICE'];
const checkOnly = process.argv.includes('--check');

async function readIfExists(target) {
  try {
    return await readFile(target, 'utf8');
  } catch {
    return null;
  }
}

const sources = new Map();
for (const file of FILES) {
  const content = await readIfExists(path.join(ROOT, file));
  if (content === null) {
    console.error(`✗ ${file} tidak ditemukan di root.`);
    process.exit(1);
  }
  sources.set(file, content);
}

const directories = (await readdir(PACKAGES_DIR, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

let changed = 0;
let outOfSync = 0;

for (const directory of directories) {
  const packageDir = path.join(PACKAGES_DIR, directory);
  const manifest = await readIfExists(path.join(packageDir, 'package.json'));
  if (manifest === null) continue;

  for (const [file, content] of sources) {
    const target = path.join(packageDir, file);
    const current = await readIfExists(target);

    if (current === content) continue;

    if (checkOnly) {
      console.error(
        `✗ packages/${directory}/${file} tidak sinkron dengan root.`,
      );
      outOfSync += 1;
      continue;
    }

    await writeFile(target, content);
    changed += 1;
  }
}

if (checkOnly) {
  if (outOfSync > 0) {
    console.error(
      `\n${outOfSync} berkas lisensi tidak sinkron. Jalankan: node tools/sync-license.mjs`,
    );
    process.exit(1);
  }
  console.log(
    'Semua paket memiliki LICENSE dan NOTICE yang sinkron dengan root.',
  );
} else {
  console.log(
    changed === 0
      ? 'Semua salinan lisensi sudah sinkron.'
      : `${changed} berkas lisensi disalin ke paket.`,
  );
}
