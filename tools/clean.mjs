#!/usr/bin/env node
/**
 * Remove build artefacts inside workspace packages.
 *
 * Usage:
 *   node tools/clean.mjs             # all packages/apps
 *   node tools/clean.mjs packages/x  # one package
 *
 * Only known artefact directories are removed, and only inside the repo.
 */

import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARTEFACTS = ['dist', 'coverage', '.turbo'];
const targets = process.argv.slice(2);

function assertInsideRoot(target) {
  const resolved = path.resolve(target);
  const relative = path.relative(ROOT, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to clean outside the repository: ${resolved}`);
  }
  return resolved;
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function cleanPackage(dir) {
  for (const artefact of ARTEFACTS) {
    const target = path.join(dir, artefact);
    if (await exists(target)) {
      await rm(target, { recursive: true, force: true });
      console.log(`removed ${path.relative(ROOT, target)}`);
    }
  }
}

async function workspaceDirs(base) {
  const resolved = path.join(ROOT, base);
  if (!(await exists(resolved))) return [];
  const entries = await readdir(resolved, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(resolved, entry.name));
}

async function main() {
  if (targets.length > 0) {
    for (const target of targets) {
      await cleanPackage(assertInsideRoot(target));
    }
    return;
  }

  for (const base of ['packages', 'apps', 'examples']) {
    for (const dir of await workspaceDirs(base)) {
      await cleanPackage(dir);
    }
  }
  for (const artefact of ARTEFACTS) {
    const target = path.join(ROOT, artefact);
    if (await exists(target)) {
      await rm(target, { recursive: true, force: true });
      console.log(`removed ${path.relative(ROOT, target)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
