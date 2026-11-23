#!/usr/bin/env node
/**
 * Copy theme CSS into dist. FND-010 will replace this with Lightning CSS
 * bundling/minification.
 */

import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'packages', 'theme', 'src');
const OUT = path.join(ROOT, 'packages', 'theme', 'dist');
const FILES = ['tokens.css', 'index.css'];

await mkdir(OUT, { recursive: true });
for (const file of FILES) {
  await copyFile(path.join(SRC, file), path.join(OUT, file));
  console.log(`theme: ${file} -> dist/${file}`);
}
