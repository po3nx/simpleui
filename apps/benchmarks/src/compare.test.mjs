import { describe, expect, it } from 'vitest';
import {
  evaluateResults,
  formatMarkdownReport,
  toBaseline,
} from './compare.mjs';

const results = [
  { name: 'a', opsPerSec: 100, meanMs: 10, samples: 20 },
  { name: 'b', opsPerSec: 50, meanMs: 20, samples: 20 },
  { name: 'c', opsPerSec: 200, meanMs: 5, samples: 20 },
];

const baseline = {
  environment: { platform: 'darwin', arch: 'arm64', node: 'node26' },
  benchmarks: {
    a: { opsPerSec: 100, meanMs: 10 },
    b: { opsPerSec: 100, meanMs: 10 },
    c: { opsPerSec: 100, meanMs: 10 },
  },
};

describe('evaluateResults', () => {
  it('menandai no-baseline bila baseline tidak ada', () => {
    const evaluation = evaluateResults(results, null);

    expect(evaluation.regressions).toBe(0);
    expect(evaluation.rows.every((row) => row.status === 'no-baseline')).toBe(
      true,
    );
  });

  it('membedakan ok, improved, dan regressed', () => {
    const evaluation = evaluateResults(results, baseline, { threshold: 0.2 });

    expect(evaluation.rows.map((row) => row.status)).toEqual([
      'ok',
      'regressed',
      'improved',
    ]);
    expect(evaluation.regressions).toBe(1);
  });

  it('memakai ambang batas untuk menentukan regresi', () => {
    const evaluation = evaluateResults(results, baseline, { threshold: 0.6 });
    expect(evaluation.regressions).toBe(0);
  });

  it('menangani entri baseline yang hilang', () => {
    const evaluation = evaluateResults(
      [{ name: 'baru', opsPerSec: 10, meanMs: 100, samples: 1 }],
      baseline,
    );

    expect(evaluation.rows[0]?.status).toBe('no-baseline');
  });
});

describe('toBaseline', () => {
  it('merekam lingkungan dan throughput', () => {
    const document = toBaseline(results, baseline.environment, '2026-11-24');

    expect(document.environment).toEqual(baseline.environment);
    expect(document.benchmarks.a).toEqual({ opsPerSec: 100, meanMs: 10 });
  });
});

describe('formatMarkdownReport', () => {
  it('memuat tabel dan path baseline', () => {
    const evaluation = evaluateResults(results, baseline);
    const report = formatMarkdownReport({
      rows: evaluation.rows,
      environment: baseline.environment,
      baselinePath: 'baselines/x.json',
    });

    expect(report).toContain('| Benchmark |');
    expect(report).toContain('baselines/x.json');
    expect(report).toContain('regressed');
  });
});
