#!/usr/bin/env node
/**
 * Validasi lisensi dependency terhadap allowlist ADR-0001 (FND-025).
 *
 * Sumber data: `pnpm licenses list --json`. Setiap lisensi dipecah menjadi
 * ekspresi (mis. "MIT OR Apache-2.0") lalu dicocokkan dengan daftar izin.
 * Lisensi di luar daftar menggagalkan pemeriksaan.
 */

import { spawn } from 'node:child_process';

/** Diizinkan untuk semua dependency (ADR-0001 §2). */
const ALLOWED = new Set([
  'MIT',
  'Apache-2.0',
  'ISC',
  '0BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BlueOak-1.0.0',
  'Unlicense',
  'CC0-1.0',
]);

/**
 * Lisensi yang hanya boleh dipakai tooling build/dev, bukan runtime, dan hanya
 * untuk paket yang disebutkan. MPL-2.0 adalah weak copyleft: aman selama tidak
 * didistribusikan bersama kode library.
 */
const DEV_ONLY_EXCEPTIONS = new Map([
  ['MPL-2.0', new Set(['lightningcss', 'lightningcss-darwin-arm64'])],
]);

function runLicenses() {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['licenses', 'list', '--json'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding('utf8').on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `pnpm licenses gagal (${code})`));
        return;
      }
      resolve(stdout);
    });
  });
}

function splitLicenseExpression(expression) {
  return expression
    .replace(/[()]/g, ' ')
    .split(/\s+(?:OR|AND)\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

let parsed;
try {
  parsed = JSON.parse(await runLicenses());
} catch (error) {
  console.error(`✗ Tidak dapat membaca daftar lisensi: ${error.message}`);
  process.exit(1);
}

const problems = [];
let checked = 0;

for (const [expression, packages] of Object.entries(parsed)) {
  for (const part of splitLicenseExpression(expression)) {
    const exceptionPackages = DEV_ONLY_EXCEPTIONS.get(part);

    for (const entry of packages) {
      checked += 1;

      if (ALLOWED.has(part)) continue;
      if (exceptionPackages?.has(entry.name)) continue;

      problems.push(
        `${entry.name}@${entry.versions?.join(', ') ?? '?'} → ${part}` +
          (exceptionPackages ? ' (di luar pengecualian)' : ''),
      );
    }
  }
}

if (problems.length > 0) {
  console.error('✗ Lisensi tidak diizinkan menurut ADR-0001:');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    '\nPerbarui docs/license-allowlist.md dan ADR-0001 sebelum menambah dependency baru.',
  );
  process.exit(1);
}

console.log(
  `Semua ${checked} entri lisensi dependency diizinkan (allowlist ADR-0001).`,
);
