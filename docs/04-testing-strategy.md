# 04 — Testing Strategy

> **Status:** Draft v1.0 · **Owner:** QA Lead · **Reviewer:** Tech Lead
> **Prasyarat:** [00 — Rule Umum §7](00-rule-umum.md#7-aturan-testing)
> **Terkait:** [05 — Security](05-security.md) · [02 — Adapter](02-adapter-cross-framework.md)

---

## 1. Filosofi

Test SimpleUI harus:

1. **Membuktikan perilaku**, bukan implementasi.
2. **Cepat dan deterministik** di lokal maupun CI.
3. **Menangkap regresi nyata** (bug, a11y, security, performa).
4. **Memberi sinyal yang jelas** saat gagal (nama test, pesan, artefak).
5. **Tidak menjadi beban** — test rapuh diperbaiki atau dihapus, bukan
   di-skip selamanya.

Prinsip: semakin dekat ke logika murni, semakin banyak dan cepat test; semakin
dekat ke browser nyata, semakin sedikit tetapi semakin bernilai.

---

## 2. Piramida dan portofolio test

| Layer                | Jumlah target | Runtime    | Tool                             | Contoh                                       |
| -------------------- | ------------- | ---------- | -------------------------------- | -------------------------------------------- |
| Unit murni           | ~60%          | < 2 menit  | Vitest (node)                    | filter, sort, group, virtual math, validator |
| Component DOM        | ~25%          | < 5 menit  | Vitest browser mode (Playwright) | render, keyboard, selection                  |
| Contract/integration | ~10%          | < 5 menit  | Vitest + harness framework       | adapter parity, data source                  |
| E2E/visual/a11y/perf | ~5%           | < 15 menit | Playwright, axe, Lighthouse      | alur pengguna, screenshot, audit             |

Untuk PR: jalankan unit + component + contract (cepat). Nightly: E2E penuh,
visual regression semua browser, a11y, performa, mutation test.

---

## 3. Tooling

| Kebutuhan          | Tool                                          | Catatan                     |
| ------------------ | --------------------------------------------- | --------------------------- |
| Test runner        | **Vitest**                                    | Workspace mode, coverage v8 |
| Browser mode       | **Vitest Browser Mode** + Playwright provider | Layout/scroll nyata         |
| E2E                | **Playwright**                                | Chromium, Firefox, WebKit   |
| A11y               | **axe-core** / `@axe-core/playwright`         | Otomatis + manual           |
| Visual             | Playwright screenshot + `pixelmatch`          | Baseline per theme/RTL      |
| Mutation           | **Stryker**                                   | Core & data pipeline        |
| Benchmark          | **tinybench** + Playwright metrics            | Regresi performa            |
| Bundle size        | **size-limit**                                | Budget per paket            |
| API surface        | **API Extractor**                             | `.api.md`                   |
| Type compatibility | **arethetypeswrong** + `tsd`                  | Resolusi modul & tipe       |
| Lint               | ESLint + Prettier + dependency-cruiser        | CI gate                     |

---

## 4. Struktur test

```text
packages/datagrid/
├─ src/
│  ├─ model/column-model.ts
│  ├─ model/column-model.test.ts        # unit, co-located
│  ├─ data/query-pipeline.ts
│  └─ data/query-pipeline.test.ts
├─ test/
│  ├─ browser/
│  │  ├─ rendering.test.ts
│  │  ├─ keyboard.test.ts
│  │  └─ selection.test.ts
│  ├─ contract/
│  │  └─ datagrid.contract.ts
│  ├─ a11y/
│  │  └─ datagrid.a11y.test.ts
│  ├─ security/
│  │  └─ datagrid.security.test.ts
│  ├─ perf/
│  │  └─ datagrid.perf.test.ts
│  └─ fixtures/
│     ├─ rows.factory.ts
│     └─ columns.factory.ts
└─ playwright/
   └─ visual.spec.ts
```

Aturan:

- Unit test co-located dengan source (`*.test.ts`).
- Test yang butuh browser masuk `test/browser/`.
- Fixture memakai factory dengan seeded random; **DILARANG** data acak tanpa
  seed.
- Test helper tidak boleh mengimpor internal package.

---

## 5. Kontrak test per fitur

Setiap fitur wajib memiliki kombinasi berikut:

| Tipe fitur                       | Unit | Component | Contract | A11y | Security           | Perf             |
| -------------------------------- | ---- | --------- | -------- | ---- | ------------------ | ---------------- |
| Logika murni (sort/filter/group) | ✅   | —         | —        | —    | —                  | ✅ jika hot path |
| Rendering sel/header             | ✅   | ✅        | ✅       | ✅   | ✅ (XSS)           | —                |
| Keyboard/focus                   | —    | ✅        | ✅       | ✅   | —                  | —                |
| Selection/editing                | ✅   | ✅        | ✅       | ✅   | ✅ (CSRF/URL)      | —                |
| Remote data                      | ✅   | ✅        | ✅       | —    | ✅ (URL/response)  | ✅               |
| Export                           | ✅   | ✅        | ✅       | —    | ✅ (CSV injection) | —                |
| State persistence                | ✅   | ✅        | ✅       | —    | ✅ (storage)       | —                |
| Template                         | —    | ✅        | ✅       | ✅   | ✅ (HTML)          | ✅ jika mahal    |
| Virtualisasi                     | ✅   | ✅        | ✅       | ✅   | —                  | ✅               |

---

## 6. Contoh test yang baik

### 6.1 Unit — filter

```ts
describe('filter', () => {
  it('should treat null and undefined as equal when using isNull', () => {
    const rows = [
      { id: 1, name: null },
      { id: 2, name: undefined },
      { id: 3, name: 'x' },
    ];
    const result = applyFilter(rows, ['name', 'isNull']);
    expect(result.map((r) => r.id)).toEqual([1, 2]);
  });

  it('should reject filter deeper than MAX_FILTER_DEPTH', () => {
    const deep = buildNestedFilter(MAX_FILTER_DEPTH + 1);
    expect(() => applyFilter([], deep)).toThrowError(/SUI-DATA-007/);
  });
});
```

### 6.2 Component — keyboard

```ts
it('should move focus to the next cell when ArrowRight is pressed', async () => {
  const { grid, user } = await renderGrid({ rows: 3, columns: 3 });
  grid.focusCell(0, 0);
  await user.keyboard('{ArrowRight}');
  expect(grid.focusedCell()).toEqual({ rowIndex: 0, columnIndex: 1 });
  expect(grid.activeElement()).toHaveAttribute('aria-colindex', '2');
});
```

### 6.3 Contract — adapter

```ts
describeAdapterContract('DataGrid', {
  adapters: ['react', 'vue', 'angular', 'vanilla'],
  async run({ mount, update, unmount, on }) {
    const events: string[] = [];
    const instance = await mount({ dataSource: rows, keyExpr: 'id' });
    on(instance, 'selectionChanged', (e) =>
      events.push(e.selectedRowKeys.join(',')),
    );

    await instance.selectRows([1, 2]);
    expect(events).toEqual(['1,2']);

    await unmount(instance);
    expect(instance.isDisposed).toBe(true);
  },
});
```

### 6.4 Security — XSS corpus

```ts
const XSS_PAYLOADS = [
  '<img src=x onerror=alert(1)>',
  '<svg/onload=alert(1)>',
  'javascript:alert(1)',
  '<a href="javascript:alert(1)">x</a>',
  '<iframe srcdoc="<script>alert(1)</script>">',
  '"><script>alert(1)</script>',
];

it.each(XSS_PAYLOADS)('should render payload as text: %s', async (payload) => {
  const { grid } = await renderGrid({ rows: [{ id: 1, name: payload }] });
  expect(grid.cellText(0, 0)).toBe(payload);
  expect(grid.queryByRole('img')).toBeNull();
  expect(document.querySelector('script')).toBeNull();
});
```

### 6.5 A11y

```ts
it('should have no serious axe violations', async () => {
  const { container } = await renderGrid({ rows: 10, columns: 5 });
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: true } },
  });
  expect(
    results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    ),
  ).toEqual([]);
});
```

---

## 7. Anti-pattern test

| Anti-pattern                | Mengapa buruk         | Ganti dengan                |
| --------------------------- | --------------------- | --------------------------- |
| Snapshot seluruh DOM        | Rapuh, sulit dibaca   | Assertion role/teks/atribut |
| `await sleep(500)`          | Flaky                 | `waitFor`/`expect.poll`     |
| Test urutan internal        | Mengunci implementasi | Test perilaku               |
| Satu test 20 assertion      | Sulit dilokalisasi    | Pecah per perilaku          |
| Mock semua hal              | Test tidak bernilai   | Mock hanya boundary         |
| Data acak tanpa seed        | Tidak reproducible    | Seeded factory              |
| Mengandalkan timezone mesin | Gagal di CI           | Set timezone eksplisit      |
| `test.skip` permanen        | Regresi tak terlihat  | Perbaiki atau hapus         |

---

## 8. Coverage dan quality gate

| Gate                         | Ambang                | Aksi jika gagal |
| ---------------------------- | --------------------- | --------------- |
| Coverage `core`              | 90% line / 85% branch | Blokir merge    |
| Coverage komponen            | 85% / 80%             | Blokir merge    |
| Coverage adapter             | 80% / 75%             | Blokir merge    |
| Coverage keseluruhan         | 85% / 80%             | Blokir merge    |
| Mutation score (core kritis) | ≥ 70%                 | Blokir rilis    |
| axe serious/critical         | 0                     | Blokir merge    |
| Security payload             | 0 lolos               | Blokir merge    |
| Bundle size                  | ≤ budget              | Blokir merge    |
| Performance regression       | ≤ 20%                 | Blokir rilis    |

Coverage diukur dengan `@vitest/coverage-v8`; laporan diunggah ke CI. Coverage
tidak boleh turun lebih dari 1% per PR tanpa persetujuan.

---

## 9. Visual regression

- Baseline disimpan per: theme (light/dark/high-contrast), arah (LTR/RTL),
  density (normal/compact), browser (Chromium; Firefox/WebKit nightly).
- Screenshot hanya area komponen, bukan seluruh halaman.
- Threshold `maxDiffPixelRatio: 0.01`.
- Perubahan baseline wajib disertai penjelasan di PR dan review desain.
- **DILARANG** menerima update baseline otomatis tanpa inspeksi.

Skenario minimal:

1. grid kosong;
2. grid 10 baris;
3. header multi-sort;
4. filter row aktif;
5. seleksi multiple;
6. edit cell;
7. group row;
8. master-detail terbuka;
9. kolom fixed + horizontal scroll;
10. dark mode;
11. RTL;
12. error state.

---

## 10. Performance test

### 10.1 Benchmark unit

```ts
bench('sort 100k rows', () => {
  sortRows(largeRows, [{ selector: 'name', desc: false }]);
});
```

Batas: lihat [00 — Rule Umum §8](00-rule-umum.md#8-aturan-performa).

### 10.2 Browser metrics

- Waktu mount, waktu scroll frame, long task, memory.
- Gunakan `PerformanceObserver` dan CDP `Performance.getMetrics`.
- Bandingkan dengan baseline di `apps/benchmarks/baseline.json`.
- Regresi > 20% memblokir rilis; 10–20% butuh justifikasi.

### 10.3 Memory leak

- Mount/unmount 100×; heap snapshot sebelum/sesudah.
- Pertumbuhan listener `ResizeObserver`, `window` listener, dan instance
  framework harus 0.
- Gunakan `--expose-gc` dan `FinalizationRegistry` untuk objek kunci.

---

## 11. A11y test

Otomatis:

- axe untuk setiap komponen dan state (loading, error, empty, editing).
- Keyboard-only E2E: tab sampai komponen, operasikan semua fungsi, keluar.
- Focus visible: screenshot/assert `:focus-visible`.

Manual (checklist sebelum GA):

- NVDA + Firefox/Chrome (Windows).
- VoiceOver + Safari (macOS/iOS).
- Zoom 200%, reflow 320px.
- High contrast mode.
- Reduced motion.

> Catatan: dua item di atas sengaja ditulis dalam bahasa campuran; saat
> implementasi, checklist final harus berbahasa Indonesia dan disimpan di
> `test/a11y/manual-checklist.md`.

---

## 12. Security test

- Corpus payload: XSS, URL, CSV, prototype pollution, HTML sanitizer bypass,
  ReDoS, large payload.
- Setiap payload dijalankan di semua adapter (minimal Chromium).
- CSP E2E: halaman dengan `Content-Security-Policy: default-src 'self'; script-src 'self'`
  harus bebas pelanggaran.
- Dependency scan: `pnpm audit --prod`, OSV, license check.
- Fuzz test parser filter/format (minimal 10.000 input acak bertarget).
- Test bahwa error production tidak memuat stack/PII.

---

## 13. CI pipeline

```text
PR:
  lint → typecheck → unit → browser (chromium) → contract (4 adapter)
  → a11y → security → build → size → api:check → license

Nightly:
  e2e (3 browser) → visual (all themes) → perf → mutation (core)
  → SSR smoke → dependency audit

Release:
  full suite → API report → publish dry-run → provenance → smoke install
```

Target durasi PR: **≤ 15 menit** (dengan cache dan sharding). Nightly ≤ 60 menit.

---

## 14. Flaky test policy

- Flaky test dilarang di `main`.
- Jika flaky: quarantine dengan issue + owner + tenggat 5 hari.
- Perbaiki akar masalah (timing, shared state, network), bukan menambah sleep.
- Test yang di-quarantine tidak dihitung sebagai coverage gate sampai kembali.

---

## 15. Exit criteria per milestone

| Milestone      | Kriteria test                                                               |
| -------------- | --------------------------------------------------------------------------- |
| DataGrid alpha | Unit + component core lulus; 1 adapter; tidak ada axe critical              |
| DataGrid beta  | 4 adapter parity lulus; security payload lulus; visual baseline 12 skenario |
| DataGrid GA    | Coverage gate; mutation core ≥ 70%; perf budget; manual a11y; 0 flaky       |
| PivotGrid GA   | Sama + test cube 1.000.000 sel                                              |
| Chart GA       | Sama + visual 20 skenario + perf 100.000 titik                              |

---

_Untuk daftar test per fitur DataGrid, lihat
[05 — DataGrid Test Plan](components/datagrid/05-test-plan.md)._
