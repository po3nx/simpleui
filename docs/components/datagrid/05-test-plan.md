# DataGrid 05 — Test Plan

> **Status:** Draft v1.0 · **Owner:** QA Lead · **Reviewer:** Grid squad
> **Prasyarat:** [04 — Testing Strategy](../../04-testing-strategy.md) ·
> [01 — Scope](01-scope.md) · [04 — Security](04-security.md)

---

## 1. Tujuan

Membuktikan bahwa DataGrid:

- berperilaku benar untuk semua fitur P0/P1;
- identik di 4 adapter;
- aman terhadap payload berbahaya;
- dapat diakses penuh dengan keyboard dan screen reader;
- memenuhi budget performa;
- tidak bocor memori.

---

## 2. Target test

| Layer             |       Jumlah minimum | Runtime target |
| ----------------- | -------------------: | -------------- |
| Unit model/data   |                  250 | < 2 menit      |
| Browser component |                   80 | < 6 menit      |
| Contract adapter  |      40 skenario × 4 | < 5 menit      |
| A11y              |                   20 | < 3 menit      |
| Security          |       60 payload × 4 | < 4 menit      |
| Visual            | 12 baseline × 3 tema | < 5 menit      |
| E2E               |              15 alur | < 8 menit      |
| Performance       |          8 benchmark | < 10 menit     |
| Memory leak       |           3 skenario | < 3 menit      |

PR suite: unit + browser + contract (Chromium). Nightly: semua.

---

## 3. Matriks test per fitur

| Fitur               | Unit | Browser | Contract | A11y | Security | Perf |
| ------------------- | ---- | ------- | -------- | ---- | -------- | ---- |
| Data lokal/remote   | ✅   | ✅      | ✅       | —    | ✅       | ✅   |
| Columns & format    | ✅   | ✅      | ✅       | ✅   | ✅       | —    |
| Resize              | ✅   | ✅      | ✅       | ✅   | —        | —    |
| Reorder             | ✅   | ✅      | ✅       | ✅   | —        | —    |
| Column chooser      | ✅   | ✅      | ✅       | ✅   | —        | —    |
| Fixed columns/bands | ✅   | ✅      | ✅       | ✅   | —        | ✅   |
| Sort single/multi   | ✅   | ✅      | ✅       | ✅   | —        | ✅   |
| Filter row          | ✅   | ✅      | ✅       | ✅   | ✅       | ✅   |
| Header filter       | ✅   | ✅      | ✅       | ✅   | ✅       | —    |
| Search              | ✅   | ✅      | ✅       | ✅   | ✅       | —    |
| Paging              | ✅   | ✅      | ✅       | ✅   | —        | —    |
| Virtual scroll      | ✅   | ✅      | ✅       | ✅   | —        | ✅   |
| Selection           | ✅   | ✅      | ✅       | ✅   | —        | ✅   |
| Keyboard/focus      | ✅   | ✅      | ✅       | ✅   | —        | —    |
| Editing             | ✅   | ✅      | ✅       | ✅   | ✅       | —    |
| Validation          | ✅   | ✅      | ✅       | ✅   | ✅       | —    |
| Grouping            | ✅   | ✅      | ✅       | ✅   | —        | ✅   |
| Master-detail       | ✅   | ✅      | ✅       | ✅   | ✅       | —    |
| Summary             | ✅   | ✅      | ✅       | ✅   | —        | —    |
| CSV export          | ✅   | ✅      | ✅       | —    | ✅       | —    |
| Excel export        | ✅   | ✅      | ✅       | —    | ✅       | —    |
| Clipboard           | ✅   | ✅      | ✅       | —    | ✅       | —    |
| Context menu        | —    | ✅      | ✅       | ✅   | —        | —    |
| State persistence   | ✅   | ✅      | ✅       | —    | ✅       | —    |
| Templates           | —    | ✅      | ✅       | ✅   | ✅       | ✅   |
| RTL                 | —    | ✅      | ✅       | ✅   | —        | —    |
| Print               | —    | ✅      | —        | —    | —        | —    |
| SSR                 | —    | —       | ✅       | —    | —        | —    |

---

## 4. Unit test (model & data)

### 4.1 Cakupan

- Column normalization & validation.
- Sort: single, multi, stable, null ordering, collator.
- Filter: setiap operator, tipe campuran, null/undefined, batas kedalaman.
- Group: multi-level, expand state, group count.
- Summary: sum/avg/min/max/count/custom, NaN/Infinity.
- Paging: skip/take, batas, total count.
- Selection: toggle, range, selectAll, preserve, missing keys.
- Focus: next/prev, page, home/end, wrap.
- Edit: start/commit/cancel, validasi, draft, rollback.
- State: serialize/deserialize, version migration, invalid state.
- Virtual math: range, offset, overscan, variable height.
- Error normalization.

### 4.2 Aturan

- Semua fungsi murni; tanpa DOM.
- Gunakan fake clock/locale/timezone.
- Fixture seeded (`createRows({ count, seed })`).
- Setiap bug regression punya test baru.

### 4.3 Contoh

```ts
describe('column model', () => {
  it('should assign stable ids when columns have no dataField', () => {
    const model = normalizeColumns([{ caption: 'A' }, { caption: 'B' }]);
    expect(model.map((c) => c.id)).toEqual(['col-0', 'col-1']);
  });

  it('should throw SUI-DG-002 when two columns share an id', () => {
    expect(() =>
      normalizeColumns([{ dataField: 'name' }, { dataField: 'name' }]),
    ).toThrowError(/SUI-DG-002/);
  });
});
```

---

## 5. Browser component test

### 5.1 Cakupan

- Render header/body/footer.
- Virtual scroll: hanya baris visible di DOM; `aria-rowindex` absolut.
- Selection via click, Ctrl, Shift, checkbox.
- Keyboard map lengkap.
- Resize/reorder via pointer & keyboard.
- Editing: trigger, commit, cancel, validasi.
- Group expand/collapse.
- Master-detail.
- Column chooser.
- Context menu.
- RTL.
- Error/empty/loading.

### 5.2 Tooling

- Vitest browser mode (Chromium).
- `@testing-library/dom` untuk query by role.
- Pointer event helper (`userEvent`).
- Assertion pada role/aria, bukan class internal.
- Cleanup setelah setiap test.

### 5.3 Contoh

```ts
it('should keep aria-rowindex absolute after scrolling', async () => {
  const { grid } = await renderGrid({ rows: 1000, rowHeight: 40 });
  await grid.scrollTo(4000);
  const first = grid.getRenderedRows()[0]!;
  expect(Number(first.getAttribute('aria-rowindex'))).toBe(101);
});
```

---

## 6. Contract test (adapter parity)

### 6.1 Skenario

40 skenario di [Adapter §8](../../02-adapter-cross-framework.md#82-desain),
dikelompokkan:

| Grup        | Jumlah | Contoh                                           |
| ----------- | -----: | ------------------------------------------------ |
| Lifecycle   |      8 | mount, update, unmount, remount, StrictMode, SSR |
| Options     |      6 | columns, dataSource, controlled/uncontrolled     |
| Interaction |     10 | sort, filter, select, keyboard, edit             |
| Events      |      6 | payload, urutan, cancel                          |
| Template    |      4 | render, update, dispose, error                   |
| Security    |      4 | XSS, URL, CSV, pollution                         |
| A11y        |      2 | role, aria                                       |

### 6.2 Aturan

- Suite yang sama dijalankan untuk React, Vue, Angular, vanilla.
- Kegagalan satu adapter memblokir rilis.
- Payload security tidak boleh berbeda hasil.
- Snapshot DOM tidak dipakai; assertion role/teks/atribut.

---

## 7. A11y test

### 7.1 Otomatis

- axe pada state: default, loading, error, empty, editing, grouped,
  master-detail, context menu, column chooser.
- Target: 0 serious/critical.
- Keyboard E2E: tab masuk, navigasi, edit, keluar.
- Focus visible: assert `:focus-visible` dan screenshot.
- Live region: assert pesan setelah sort/filter/page.

### 7.2 Manual

- NVDA + Chrome/Firefox (Windows).
- VoiceOver + Safari (macOS/iOS).
- Zoom 200%, reflow 320px.
- High contrast, reduced motion.
- Checklist disimpan di `test/a11y/manual-checklist.md`.

### 7.3 Skenario manual minimum

1. Sort via keyboard, dengar pengumuman.
2. Filter header, navigasi dialog, apply.
3. Pilih baris, dengar jumlah terpilih.
4. Edit sel, validasi error diumumkan.
5. Buka column chooser, toggle, tutup.
6. Group expand/collapse.
7. Master-detail expand.
8. Context menu keyboard.

---

## 8. Security test

- Corpus di [04 — Security §5](04-security.md#5-security-test-corpus).
- Dijalankan di 4 adapter.
- CSP E2E: halaman dengan `default-src 'self'`; tidak ada pelanggaran.
- Export: periksa isi file (prefix `'`, tidak ada formula).
- State: JSON korup/oversize diabaikan.
- Network: URL invalid ditolak; token tidak muncul di log.
- Fuzz: 10.000 input filter/format; tidak ada crash/hang.

---

## 9. Visual regression

Baseline 12 skenario × 3 tema (light/dark/high-contrast) × LTR/RTL:

1. empty;
2. 10 baris;
3. multi-sort;
4. filter row;
5. header filter;
6. selection multiple;
7. edit cell;
8. group;
9. master-detail;
10. fixed columns + scroll;
11. context menu;
12. error state.

Threshold `maxDiffPixelRatio: 0.01`. Review baseline manual.

---

## 10. Performance test

| Skenario                   | Target              | Metode           |
| -------------------------- | ------------------- | ---------------- |
| Mount 10.000 baris         | ≤ 300 ms            | Performance.mark |
| Mount 100.000 baris remote | ≤ 500 ms            | mock store       |
| Scroll 5 detik             | ≥ 95% frame ≤ 16 ms | rAF sampling     |
| Sort 100.000 baris         | ≤ 150 ms            | tinybench        |
| Filter 100.000 baris       | ≤ 100 ms            | tinybench        |
| Group 100.000 baris        | ≤ 300 ms            | tinybench        |
| Selection 1.000            | ≤ 50 ms             | browser          |
| Edit commit                | ≤ 100 ms            | browser          |
| Memory 100k remote         | ≤ 150 MB            | CDP              |
| Mount/unmount 100×         | pertumbuhan ≤ 5%    | heap snapshot    |

Regresi > 20% memblokir rilis; 10–20% butuh justifikasi.

---

## 11. Memory leak test

- Mount/unmount 100×; hitung listener `window`/`document`, `ResizeObserver`,
  `MutationObserver`, instance template.
- Pastikan `dispose()` melepas semua.
- Gunakan `FinalizationRegistry` untuk objek kunci.
- Tidak ada pertumbuhan DOM node setelah 100 siklus.

---

## 12. Fixture dan data generator

```ts
export interface RowFactoryOptions {
  count: number;
  seed?: number;
  columns?: number;
  withNulls?: boolean;
  withUnicode?: boolean;
  withLongText?: boolean;
}

export function createRows(options: RowFactoryOptions): Row[];
```

- Seeded PRNG (mulberry32).
- Data mencakup: null, undefined, string kosong, Unicode, emoji, teks panjang,
  angka negatif, tanggal, boolean.
- Fixture keamanan terpisah (`security-fixtures.ts`).
- **DILARANG** data produksi/PII di fixture.

---

## 13. Browser matrix

| Browser                 | PR  | Nightly |
| ----------------------- | --- | ------- |
| Chromium                | ✅  | ✅      |
| Firefox                 | —   | ✅      |
| WebKit (Safari)         | —   | ✅      |
| Mobile Safari (emulasi) | —   | ✅      |
| Edge                    | —   | ✅      |

---

## 14. Exit criteria

### Alpha

- [ ] Unit 200+ lulus.
- [ ] Browser 50+ lulus.
- [ ] Contract React + vanilla lulus.
- [ ] 0 axe critical.
- [ ] Security corpus lulus.
- [ ] Perf mount 10k ≤ 300 ms.

### Beta

- [ ] Semua matriks fitur P0/P1 tercakup.
- [ ] Contract 4 adapter lulus.
- [ ] A11y manual pass.
- [ ] Visual 12 baseline.
- [ ] Memory leak test lulus.
- [ ] Security sign-off.

### GA

- [ ] Coverage: model/data ≥ 90%, komponen ≥ 85%, adapter ≥ 80%.
- [ ] Mutation score core ≥ 70%.
- [ ] Semua performance target.
- [ ] 0 flaky test.
- [ ] Tidak ada known critical/high bug.
- [ ] Test plan ini ditinjau dan disetujui.

---

_Untuk jadwal test, lihat [06-implementation-plan.md](06-implementation-plan.md)._
