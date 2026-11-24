#!/usr/bin/env node
/**
 * Release smoke test (FND-033): kemas tarball, periksa isinya, pasang di app
 * bersih, lalu jalankan API publik dari hasil instalasi.
 *
 * Mengecek juga kesiapan CDN: exports ESM + types, files: dist, sideEffects
 * false, dan tidak ada entry `require` (ADR-0011: ESM-only).
 */

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = path.join(ROOT, '.release-smoke');
const TARBALLS = path.join(WORK, 'tarballs');
const APP = path.join(WORK, 'app');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? ROOT,
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
    env: { ...process.env, ...options.env },
  });
}

async function publishablePackages() {
  const directory = path.join(ROOT, 'packages');
  const entries = await readdir(directory, { withFileTypes: true });
  const packages = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(directory, entry.name, 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (!manifest.private) {
      packages.push({ dir: path.join(directory, entry.name), manifest });
    }
  }

  return packages;
}

function cdnReadiness(manifest) {
  const problems = [];
  const rootExport = manifest.exports?.['.'];
  const isAssetPackage = typeof rootExport === 'string' || !rootExport?.import;

  if (!rootExport) problems.push('exports["."] tidak ada');
  if (!manifest.files?.includes('dist'))
    problems.push('files tidak memuat dist');
  if (manifest.publishConfig?.access !== 'public') {
    problems.push('publishConfig.access bukan public');
  }

  if (!isAssetPackage) {
    if (!rootExport.types) problems.push('exports["."].types tidak ada');
    if (rootExport.require) problems.push('ada entry require (harus ESM-only)');
    if (manifest.sideEffects !== false)
      problems.push('sideEffects bukan false');
  }

  return problems;
}

function tarballChecks(file, isAssetPackage = false) {
  const entries = run('tar', ['-tzf', file]).split('\n').filter(Boolean);
  const has = (pattern) => entries.some((entry) => pattern.test(entry));

  const distPattern = isAssetPackage
    ? /^package\/dist\/.+\.(css|js)$/
    : /^package\/dist\/.+\.js$/;

  assert(has(distPattern), `${file}: dist tidak lengkap`);
  assert(has(/^package\/LICENSE$/), `${file}: LICENSE tidak ada`);
  assert(has(/^package\/NOTICE$/), `${file}: NOTICE tidak ada`);
  assert(!has(/^package\/src\//), `${file}: src/ tidak boleh ikut`);
  assert(!has(/__tests__|\.test\./), `${file}: file test ikut terkemas`);
}

const packages = await publishablePackages();
assert(packages.length > 0, 'tidak ada paket publishable');

await rm(WORK, { recursive: true, force: true });
await mkdir(TARBALLS, { recursive: true });

const installed = [];

for (const { dir, manifest } of packages) {
  const problems = cdnReadiness(manifest);
  assert(
    problems.length === 0,
    `${manifest.name} tidak siap CDN: ${problems.join(', ')}`,
  );

  const isAssetPackage =
    typeof manifest.exports?.['.'] === 'string' ||
    !manifest.exports?.['.']?.import;

  run('pnpm', ['pack', '--pack-destination', TARBALLS], { cwd: dir });

  const filename = `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`;
  const file = path.join(TARBALLS, filename);
  tarballChecks(file, isAssetPackage);
  installed.push(file);
}

await mkdir(APP, { recursive: true });
await writeFile(
  path.join(APP, 'package.json'),
  `${JSON.stringify(
    {
      name: 'simpleui-release-smoke',
      private: true,
      type: 'module',
      dependencies: Object.fromEntries(
        packages.map(({ manifest }) => [manifest.name, manifest.version]),
      ),
    },
    null,
    2,
  )}\n`,
);

run(
  'npm',
  [
    'install',
    '--no-audit',
    '--no-fund',
    '--legacy-peer-deps',
    '--offline',
    ...installed.map((file) => path.relative(APP, file)),
  ],
  {
    cwd: APP,
    env: {
      npm_config_offline: 'true',
      // Cache npm di dalam workspace agar tidak menyentuh HOME (sandbox/CI).
      npm_config_cache: path.join(WORK, 'npm-cache'),
    },
  },
);

await writeFile(
  path.join(APP, 'smoke.mjs'),
  `import {
  ArrayStore,
  DataError,
  createVirtualizer,
  safeMerge,
  toCsv,
} from '@simpleui/core';
import { createRows } from '@simpleui/testing';

const rows = createRows({ seed: 'release', count: 5 });
const store = new ArrayStore(rows, { key: 'id' });
const loaded = await store.load({ filter: ['active', 'eq', true], take: 10 });

const virtualizer = createVirtualizer({
  itemCount: 100_000,
  itemSize: 32,
  viewportSize: 640,
});

const merged = safeMerge({ a: 1, nested: { b: 2 } }, { nested: { c: 3 } });
const csv = toCsv([{ note: '=cmd' }]);

if (loaded.data.length > 5) throw new Error('filter/limit salah');
if (virtualizer.range.end <= 0) throw new Error('virtualizer kosong');
if (merged.nested.c !== 3) throw new Error('safeMerge gagal');
if (!csv.includes("'=cmd")) throw new Error('CSV guard gagal');
if (typeof DataError !== 'function') throw new Error('DataError tidak diekspor');

console.log('smoke OK:', loaded.data.length, 'baris,', virtualizer.range.end, 'item render');
`,
);

run('node', ['smoke.mjs'], { cwd: APP });

const themeCss = await readFile(
  path.join(APP, 'node_modules', '@simpleui', 'theme', 'dist', 'index.css'),
  'utf8',
);
assert(
  themeCss.includes('--sui-color-accent-default'),
  'CSS tema tidak lengkap',
);

console.log(
  `\nRelease smoke lulus: ${packages.length} tarball, instalasi bersih, API publik berjalan.`,
);
