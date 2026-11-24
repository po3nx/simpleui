import { Bench } from 'tinybench';

/** Informasi lingkungan; baseline hanya dibandingkan pada lingkungan sama. */
export function environmentInfo() {
  const [major] = process.versions.node.split('.');
  return {
    platform: process.platform,
    arch: process.arch,
    node: `node${major}`,
  };
}

export function environmentKey(environment = environmentInfo()) {
  return `${environment.platform}-${environment.arch}-${environment.node}`;
}

/**
 * Jalankan definisi benchmark `{ name, fn }` dan kembalikan hasil terukur.
 * `iterations` kecil agar cocok untuk operasi yang relatif mahal.
 */
export async function runBenchmarks(definitions, { iterations = 20 } = {}) {
  const bench = new Bench({ iterations, retainSamples: true });

  for (const definition of definitions) {
    bench.add(definition.name, definition.fn);
  }

  await bench.run();

  return bench.tasks
    .filter((task) => task.result && 'throughput' in task.result)
    .map((task) => ({
      name: task.name,
      opsPerSec: task.result.throughput.mean,
      meanMs: task.result.latency.mean,
      samples: task.result.latency.samples?.length ?? 0,
    }));
}
