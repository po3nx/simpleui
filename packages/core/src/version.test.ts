import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VERSION } from './version.js';

interface PackageManifest {
  version: string;
}

const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageManifest;

describe('VERSION', () => {
  it('harus sama dengan versi di package.json', () => {
    expect(VERSION).toBe(manifest.version);
  });
});
