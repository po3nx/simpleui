/**
 * Perbandingan hasil benchmark terhadap baseline (FND-023).
 * Regresi didefinisikan sebagai penurunan throughput melebihi `threshold`.
 */

export const DEFAULT_THRESHOLD = 0.2;

export function evaluateResults(
  results,
  baseline,
  { threshold = DEFAULT_THRESHOLD } = {},
) {
  const rows = results.map((result) => {
    const base = baseline?.benchmarks?.[result.name];

    if (!base) {
      return { ...result, status: 'no-baseline', delta: null };
    }

    const delta =
      base.opsPerSec > 0 ? result.opsPerSec / base.opsPerSec - 1 : 0;

    let status = 'ok';
    if (delta <= -threshold) status = 'regressed';
    else if (delta >= threshold) status = 'improved';

    return {
      ...result,
      baselineOpsPerSec: base.opsPerSec,
      delta,
      status,
    };
  });

  return {
    rows,
    regressions: rows.filter((row) => row.status === 'regressed').length,
  };
}

export function toBaseline(results, environment, generatedAt) {
  return {
    environment,
    generatedAt,
    benchmarks: Object.fromEntries(
      results.map((result) => [
        result.name,
        { opsPerSec: result.opsPerSec, meanMs: result.meanMs },
      ]),
    ),
  };
}

function formatNumber(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

function formatDelta(delta) {
  if (delta === null) return '—';
  const percent = (delta * 100).toFixed(1);
  return `${delta > 0 ? '+' : ''}${percent}%`;
}

/** Laporan Markdown yang bisa diunggah sebagai artifact CI. */
export function formatMarkdownReport({ rows, environment, baselinePath }) {
  const header = [
    '# Benchmark Report',
    '',
    `- Lingkungan: \`${environment.platform}-${environment.arch}-${environment.node}\``,
    `- Baseline: ${baselinePath ?? 'tidak ada'}`,
    '',
    '| Benchmark | ops/detik | mean (ms) | Δ vs baseline | Status |',
    '| --- | ---: | ---: | ---: | --- |',
  ];

  const body = rows.map(
    (row) =>
      `| \`${row.name}\` | ${formatNumber(row.opsPerSec)} | ${formatNumber(row.meanMs, 3)} | ${formatDelta(row.delta)} | ${row.status} |`,
  );

  return `${[...header, ...body].join('\n')}\n`;
}
