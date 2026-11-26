#!/usr/bin/env node
/**
 * Import-safety/SSR check (DG-055): semua paket harus bisa di-import di Node
 * tanpa DOM. Kegagalan biasanya berarti akses document/window di top-level.
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packages = {
  '@simpleui/core': 'packages/core/dist/index.js',
  '@simpleui/datagrid': 'packages/datagrid/dist/index.js',
  '@simpleui/react': 'packages/adapter-react/dist/index.js',
  '@simpleui/vue': 'packages/adapter-vue/dist/index.js',
  '@simpleui/angular': 'packages/adapter-angular/dist/index.js',
  '@simpleui/vanilla': 'packages/adapter-vanilla/dist/index.js',
};

let failed = false;
for (const [name, relative] of Object.entries(packages)) {
  try {
    await import(pathToFileURL(path.join(ROOT, relative)).href);
    console.log(`✓ ${name}`);
  } catch (error) {
    failed = true;
    console.error(
      `✗ ${name}: ${error instanceof Error ? error.message : error}`,
    );
  }
}
if (failed) process.exit(1);
console.log('SSR import-safety: semua paket aman di Node tanpa DOM.');
