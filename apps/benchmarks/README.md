# @simpleui/benchmarks

Harness benchmark, baseline, dan laporan regresi (FND-023).

```bash
pnpm --filter @simpleui/benchmarks bench          # bandingkan dengan baseline
pnpm --filter @simpleui/benchmarks bench:update   # tulis baseline lingkungan ini
pnpm --filter @simpleui/benchmarks test           # test logika perbandingan
```

## Baseline per lingkungan

Angka benchmark sangat bergantung pada mesin. Karena itu baseline disimpan per
`<platform>-<arch>-<node>` di `baselines/`; mesin lain hanya melaporkan hasil
tanpa membandingkan (dan tanpa gagal).

Menulis baseline di lingkungan baru:

```bash
node bench.mjs --update
```

## Ambang regresi

- Default: throughput turun **> 20%** dibanding baseline → exit code 1.
- Ubah dengan `node bench.mjs --threshold 0.1`.
- Laporan ditulis ke `bench-report.md` dan `bench-report.json` (di-ignore Git,
  diunggah sebagai artifact CI).

## Skenario saat ini

| Benchmark                     | Cakupan                                |
| ----------------------------- | -------------------------------------- |
| `virtualizer.setScrollOffset` | 100.000 baris, satu pembaruan rentang  |
| `ArrayStore.load`             | filter + sort + page pada 10.000 baris |
| selector memoized             | pemanggilan berulang dengan state sama |
| `store.transaction`           | 10 perubahan dalam satu transaksi      |

Catatan: target runtime docs/00 §8.2 (mis. sort 100k ≤ 150 ms) belum semuanya
masuk; skenario ditambah bersama komponen.
