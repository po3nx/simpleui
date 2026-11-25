#!/usr/bin/env node
/**
 * Validasi paket sebelum dipublikasikan (FND-009).
 *
 * Menjalankan `publint` dan `arethetypeswrong` untuk setiap paket di
 * `packages/*`. Profil `esm-only` dipakai karena ADR-0011 memutuskan CJS tidak
 * dipublikasikan pada 1.0 — tanpa profil itu, attw akan selamanya merah pada
 * peringatan "CJS resolves to ESM" yang memang disengaja.
 *
 * Prasyarat: `pnpm build` sudah dijalankan (dist/ harus ada).
 */

import { spawn } from 'node:child_process';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');

const PUBLINT_BIN = path.join(ROOT, 'node_modules', 'publint', 'src', 'cli.js');
const ATTW_BIN = path.join(
  ROOT,
  'node_modules',
  '@arethetypeswrong',
  'cli',
  'dist',
  'index.js',
);

// `attw --pack` memanggil `npm pack`, yang menulis ke cache npm. Cache
// diarahkan ke dalam repo supaya tidak bergantung pada izin tulis direktori
// home (lingkungan sandbox menolaknya) dan tidak meninggalkan artefak di CI.
const NPM_CACHE = path.join(ROOT, 'node_modules', '.cache', 'npm');

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function run(cliPath, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: ROOT,
      env: {
        ...process.env,
        npm_config_cache: NPM_CACHE,
        NO_COLOR: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.setEncoding('utf8').on('data', (chunk) => {
      output += chunk;
    });
    child.on('close', (code) => resolve({ ok: code === 0, output }));
  });
}

const directories = (await readdir(PACKAGES_DIR, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const failures = [];

for (const directory of directories) {
  const packageDir = path.join(PACKAGES_DIR, directory);
  const manifestPath = path.join(packageDir, 'package.json');

  if (!(await exists(manifestPath))) continue;

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  if (manifest.private) {
    console.log(`- ${manifest.name}: dilewati (private)`);
    continue;
  }

  if (!(await exists(path.join(packageDir, 'dist')))) {
    console.error(
      `✗ ${manifest.name}: dist/ belum ada — jalankan \`pnpm build\` lebih dulu.`,
    );
    failures.push(manifest.name);
    continue;
  }

  const publint = await run(PUBLINT_BIN, [packageDir]);
  // CSS bukan modul JS: attw tidak dapat me-resolve tipe/JS untuk entrypoint
  // `.css`, jadi entrypoint tersebut dikecualikan dari pemeriksaan attw.
  const cssEntrypoints = Object.keys(manifest.exports ?? {}).filter((key) =>
    key.endsWith('.css'),
  );
  const attwArgs = [
    '--pack',
    packageDir,
    '--profile',
    'esm-only',
    '--no-emoji',
    ...(cssEntrypoints.length > 0
      ? ['--exclude-entrypoints', ...cssEntrypoints]
      : []),
  ];
  const attw = await run(ATTW_BIN, attwArgs);

  if (publint.ok && attw.ok) {
    console.log(`✓ ${manifest.name}`);
    continue;
  }

  failures.push(manifest.name);
  console.error(`✗ ${manifest.name}`);
  if (!publint.ok) console.error(publint.output.trim());
  if (!attw.ok) console.error(attw.output.trim());
}

if (failures.length > 0) {
  console.error(
    `\n${failures.length} paket gagal validasi: ${failures.join(', ')}`,
  );
  process.exit(1);
}

console.log(
  '\nSemua paket lolos publint + arethetypeswrong (profil esm-only).',
);
