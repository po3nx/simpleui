#!/usr/bin/env node
/**
 * Bundel UMD adapter vanilla (DG-053). Dijalankan setelah `tsc -b`.
 * Pemakaian: node tools/build-umd.mjs packages/adapter-vanilla
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const packageDir = path.resolve(process.cwd(), process.argv[2] ?? '.');
const outfile = path.join(packageDir, 'dist', 'simpleui-vanilla.umd.js');

await mkdir(path.dirname(outfile), { recursive: true });
await build({
  entryPoints: [path.join(packageDir, 'src', 'umd-entry.ts')],
  outfile,
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'SimpleUI',
  target: ['chrome111', 'firefox111', 'safari16', 'edge111'],
  sourcemap: true,
  logLevel: 'info',
});
console.log(`umd: ${path.relative(process.cwd(), outfile)}`);
