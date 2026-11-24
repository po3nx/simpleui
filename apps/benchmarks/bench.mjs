#!/usr/bin/env node
/**
 * CLI benchmark (FND-023).
 *
 *   node bench.mjs               # bandingkan dengan baseline lingkungan ini
 *   node bench.mjs --update      # tulis baseline baru
 *   node bench.mjs --threshold 0.1
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BENCHMARKS } from './src/benches.mjs';
import {
  environmentInfo,
  environmentKey,
  runBenchmarks,
} from './src/harness.mjs';
import {
  DEFAULT_THRESHOLD,
  evaluateResults,
  formatMarkdownReport,
  toBaseline,
} from './src/compare.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BASELINE_DIR = path.join(ROOT, 'baselines');
const update = process.argv.includes('--update');

const thresholdIndex = process.argv.indexOf('--threshold');
const threshold =
  thresholdIndex >= 0
    ? Number(process.argv[thresholdIndex + 1])
    : DEFAULT_THRESHOLD;

function argumentValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readBaseline(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

const environment = environmentInfo();
const key = environmentKey(environment);
const baselineRelative = path.join('baselines', `${key}.json`);
const baselinePath = path.join(ROOT, baselineRelative);

console.log(`Benchmark ${BENCHMARKS.length} skenario pada ${key}...`);
const results = await runBenchmarks(BENCHMARKS, {
  iterations: Number(argumentValue('--iterations') ?? 20),
});

if (update) {
  await mkdir(BASELINE_DIR, { recursive: true });
  const baseline = toBaseline(results, environment, new Date().toISOString());

  await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Baseline ditulis: ${baselineRelative}`);
  process.exit(0);
}

const baseline = await readBaseline(baselinePath);
const evaluation = evaluateResults(results, baseline, { threshold });
const report = formatMarkdownReport({
  rows: evaluation.rows,
  environment,
  baselinePath: baseline ? baselineRelative : null,
});

await writeFile(path.join(ROOT, 'bench-report.md'), report);
await writeFile(
  path.join(ROOT, 'bench-report.json'),
  `${JSON.stringify(
    {
      environment,
      baseline: baseline ? baselineRelative : null,
      threshold,
      rows: evaluation.rows,
      regressions: evaluation.regressions,
    },
    null,
    2,
  )}\n`,
);

console.log(report);

if (!baseline) {
  console.log(
    'Catatan: baseline untuk lingkungan ini belum ada. Jalankan `pnpm --filter @simpleui/benchmarks bench:update` pada mesin yang sama.',
  );
}

if (evaluation.regressions > 0) {
  console.error(
    `${evaluation.regressions} benchmark turun lebih dari ${(threshold * 100).toFixed(0)}% dibanding baseline.`,
  );
  process.exit(1);
}
