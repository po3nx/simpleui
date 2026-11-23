# 01 — Arsitektur SimpleUI

> **Status:** Draft v1.0 · **Owner:** Tech Lead · **Reviewer:** Core engineers
> **Prasyarat:** [00 — Rule Umum](00-rule-umum.md)
> **Dokumen terkait:** [Adapter](02-adapter-cross-framework.md) ·
> [Data Layer](03-data-layer.md) · [Build](07-build-release.md)

---

## 1. Tujuan arsitektur

SimpleUI harus memenuhi lima cara konsumsi tanpa menduplikasi perilaku:

1. **JavaScript** — `<script>` UMD dari CDN, inisialisasi `new SimpleUI.DataGrid(el, options)`.
2. **TypeScript** — ESM, tipe generik penuh, tree-shakeable.
3. **React** — komponen deklaratif, props/events, StrictMode-safe.
4. **Vue** — komponen SFC-friendly, `v-model`, slots.
5. **Angular** — standalone component, `@Input`/`@Output`, OnPush, SSR-safe.

Kebutuhan non-fungsional: keamanan, aksesibilitas WCAG 2.2 AA, performa pada
100.000 baris, API stabil, dan bundle kecil.

### 1.1 Quality attributes dan taktik

| Atribut                      | Taktik utama                                                       |
| ---------------------------- | ------------------------------------------------------------------ |
| Konsistensi lintas framework | Satu core DOM + adapter tipis + parity test suite                  |
| Maintainability              | Layering ketat, dependency rule, file kecil, TSDoc                 |
| Security                     | Default aman, sanitizer terpusat, tanpa `eval`, dependency minimal |
| Performance                  | Virtualisasi, row recycling, batch render, budget di CI            |
| Accessibility                | Pola ARIA standar, roving tabindex, live region, axe + manual test |
| Testability                  | Fungsi murni, dependency injection, contract test                  |
| Portability                  | ESM-first, import-safe SSR, tanpa asumsi bundler                   |

---

## 2. Konteks sistem

```text
┌──────────────────────────────────────────────────────────────────┐
│ Consumer application                                             │
│  React / Vue / Angular / Vanilla JS / TypeScript                 │
└───────────────┬──────────────────────────────────────────────────┘
                │ props / options / events / templates
┌───────────────▼──────────────────────────────────────────────────┐
│ Adapter package (@simpleui/react|vue|angular|vanilla)            │
│  - props → options diff                                          │
│  - events → callbacks / outputs                                  │
│  - framework template → TemplateBridge                           │
│  - lifecycle & cleanup                                           │
└───────────────┬──────────────────────────────────────────────────┘
                │ public component API
┌───────────────▼──────────────────────────────────────────────────┐
│ Component package (@simpleui/datagrid, pivotgrid, charts)        │
│  model · data pipeline · view/renderer · interaction · api       │
└───────────────┬──────────────────────────────────────────────────┘
                │ public core API
┌───────────────▼──────────────────────────────────────────────────┐
│ Core (@simpleui/core)                                            │
│  kernel · state · dom · events · focus · i18n · data · security  │
└───────────────┬──────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────┐
│ Platform: DOM, CSSOM, Intl, fetch, AbortController, ResizeObserver│
└──────────────────────────────────────────────────────────────────┘
```

Tidak ada panah balik dari core ke adapter/komponen.

---

## 3. Gaya arsitektur

### 3.1 Hybrid: DOM engine bersama + adapter tipis

Alternatif yang dipertimbangkan:

| Opsi                                          | Kelebihan                                       | Kekurangan                                                                     | Keputusan                                                 |
| --------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| **A. Headless core + renderer per framework** | Integrasi paling native                         | Perilaku & a11y diduplikasi 4×; bug tidak konsisten; biaya QA meledak          | Ditolak                                                   |
| **B. Web Components saja**                    | Standar, framework-agnostic                     | Styling/SSR/forms/Angular integration rumit; portal & template framework sulit | Ditolak untuk v1, dipertimbangkan sebagai output tambahan |
| **C. DOM engine bersama + adapter tipis**     | Satu perilaku, konsisten, biaya adaptasi rendah | Butuh template bridge & manajemen lifecycle yang disiplin                      | **Dipilih**                                               |
| D. Fork library lain                          | Cepat di awal                                   | Lisensi, kontrol, technical debt, ketergantungan                               | Ditolak                                                   |

Keputusan resmi: **ADR-0004** (lihat §11).

### 3.2 Konsekuensi

- Semua fitur harus dirancang agar dapat dipakai dari DOM API murni.
- Template framework dijembatani; tidak ada asumsi React/Vue/Angular di core.
- Adapter tidak boleh "memperbaiki" perilaku; jika ada bug, perbaiki di core.
- Demo dan test wajib mencakup semua adapter untuk fitur yang sama.

---

## 4. Package dan batas dependensi

```text
packages/
├─ core/                  @simpleui/core
│  ├─ src/kernel/         lifecycle, options, events, disposal
│  ├─ src/state/          store, transactions, selectors
│  ├─ src/dom/            element, class, style, resize, scroll
│  ├─ src/a11y/           focus manager, keyboard, announcer, roving tabindex
│  ├─ src/data/           DataSource, stores, query pipeline, cache
│  ├─ src/format/         number/date/string formatting (Intl)
│  ├─ src/i18n/           messages, locale, RTL
│  ├─ src/security/       sanitizer facade, safeMerge, safeUrl, csv guard
│  ├─ src/scheduler/      raf/microtask batching
│  └─ src/index.ts
├─ theme/                 @simpleui/theme (tokens + CSS, tanpa JS runtime)
├─ icons/                 @simpleui/icons (SVG tree-shakeable)
├─ datagrid/              @simpleui/datagrid
├─ pivotgrid/             @simpleui/pivotgrid
├─ charts/                @simpleui/charts
├─ adapter-react/         @simpleui/react
├─ adapter-vue/           @simpleui/vue
├─ adapter-angular/       @simpleui/angular (ng-packagr)
├─ adapter-vanilla/       @simpleui/vanilla (UMD, jQuery bridge opsional)
├─ testing/               @simpleui/testing (harness, fixtures, payloads)
└─ eslint-config/         konfigurasi lint bersama
```

### 4.1 Matriks dependensi

| Paket             | Boleh bergantung pada                                     | Dilarang                         |
| ----------------- | --------------------------------------------------------- | -------------------------------- |
| `core`            | platform                                                  | React, Vue, Angular, komponen    |
| `theme`           | —                                                         | semua paket JS                   |
| `icons`           | —                                                         | core, framework                  |
| `datagrid`        | `core`, `theme` (peer/opsional)                           | `charts`, `pivotgrid`, adapter   |
| `pivotgrid`       | `core`, `theme`                                           | `datagrid`, `charts`, adapter    |
| `charts`          | `core`, `theme`                                           | `datagrid`, `pivotgrid`, adapter |
| `adapter-react`   | `core`, `datagrid`, `pivotgrid`, `charts`, `react` (peer) | adapter lain                     |
| `adapter-vue`     | `core`, komponen, `vue` (peer)                            | adapter lain                     |
| `adapter-angular` | `core`, komponen, `@angular/*` (peer)                     | adapter lain                     |
| `adapter-vanilla` | `core`, komponen                                          | adapter lain                     |
| `testing`         | public API semua paket                                    | internal package                 |

### 4.2 Struktur internal komponen

```text
packages/datagrid/src/
├─ model/
│  ├─ grid-state.ts
│  ├─ column-model.ts
│  ├─ selection-model.ts
│  ├─ focus-model.ts
│  └─ edit-model.ts
├─ data/
│  ├─ data-controller.ts
│  ├─ query-pipeline.ts
│  └─ summary-engine.ts
├─ view/
│  ├─ grid-renderer.ts
│  ├─ header-renderer.ts
│  ├─ row-renderer.ts
│  ├─ virtualizer.ts
│  └─ styles/
├─ interaction/
│  ├─ keyboard-controller.ts
│  ├─ pointer-controller.ts
│  ├─ resize-controller.ts
│  ├─ reorder-controller.ts
│  └─ edit-controller.ts
├─ api/
│  ├─ data-grid.ts
│  ├─ options.ts
│  ├─ events.ts
│  └─ types.ts
└─ index.ts
```

Aturan: `model` tidak boleh mengimpor `view`/`interaction`; `view` membaca
state dan memanggil callback, tidak memutasi state langsung.

---

## 5. Runtime core

### 5.1 Kernel

Setiap komponen adalah instance dengan lifecycle eksplisit:

```ts
export interface ComponentKernel<TOptions, TInstance> {
  readonly element: HTMLElement;
  option<K extends keyof TOptions>(name: K): TOptions[K];
  option<K extends keyof TOptions>(name: K, value: TOptions[K]): void;
  option(options: Partial<TOptions>): void;
  beginUpdate(): void;
  endUpdate(): void;
  repaint(): void;
  dispose(): void;
}
```

Lifecycle:

```text
create → configure → mount → ready
                         │
                         ├─ update (option/props) → schedule render
                         ├─ interaction → state change → schedule render
                         └─ dispose → cleanup → disposed
```

Aturan:

- `create` **tidak** menyentuh DOM target selain menyiapkan struktur internal.
- `mount` membuat DOM, memasang listener, mengukur, lalu memuat data.
- `option` sebelum `mount` hanya menyimpan konfigurasi; tidak memicu render.
- `dispose` idempoten; boleh dipanggil berkali-kali.
- Setelah `dispose`, semua method selain `dispose` menjadi no-op atau melempar
  `SimpleUIError('SUI-CORE-002')` di mode development.

### 5.2 State dan transaksi

```ts
export interface Store<TState> {
  getState(): Readonly<TState>;
  setState(
    patch: Partial<TState> | ((state: Readonly<TState>) => Partial<TState>),
  ): void;
  transaction(fn: () => void): void;
  subscribe(
    listener: (state: Readonly<TState>, prev: Readonly<TState>) => void,
  ): () => void;
}
```

- State disimpan sebagai objek immutable per slice.
- `transaction` menunda notifikasi sampai transaksi terluar selesai.
- Render dijadwalkan sekali per frame; notifikasi state boleh sinkron untuk
  listener non-render.
- Selector murni dan memoized bila mahal.

### 5.3 Rendering

- Renderer menulis DOM secara langsung dengan helper `el()`, `attr()`,
  `classNames()`.
- Tidak ada VDOM umum. Untuk baris grid, digunakan **row recycling**: node
  baris dipakai ulang, konten sel di-update hanya jika key berubah.
- Perubahan selection/focus tidak boleh mengganti seluruh baris; cukup class dan
  atribut ARIA.
- Style dinamis (lebar kolom, tinggi baris) ditulis via CSS custom property
  pada elemen, bukan string style HTML:

```ts
element.style.setProperty('--sui-grid-col-width', `${width}px`);
```

- Semua teks dari data memakai `textContent`; HTML hanya lewat
  `sanitizeHtml()` dengan `allowHtml: true`.

### 5.4 Scheduler

- Prioritas: interaksi pengguna > render > pekerjaan latar.
- Gunakan `requestAnimationFrame` untuk render visual dan `queueMicrotask` untuk
  state notification.
- Batalkan frame yang tertunda saat `dispose`.
- Gunakan `scheduler.yield()` bila tersedia untuk memecah pekerjaan > 16 ms,
  fallback ke `setTimeout(0)`.

### 5.5 Service dan dependency injection

Service dibuat per instance (bukan singleton global):

| Service          | Tanggung jawab                  | Dapat diganti untuk test |
| ---------------- | ------------------------------- | ------------------------ |
| `DomAdapter`     | create element, measure, scroll | ya                       |
| `Clock`          | now, timeout                    | ya                       |
| `IdGenerator`    | ID unik                         | ya                       |
| `LocaleService`  | format angka/tanggal, arah teks | ya                       |
| `NetworkClient`  | fetch, timeout, abort, retry    | ya                       |
| `Announcer`      | live region a11y                | ya                       |
| `FocusManager`   | roving tabindex, focus trap     | ya                       |
| `ResizeService`  | ResizeObserver                  | ya                       |
| `StorageService` | state persistence               | ya                       |
| `Sanitizer`      | sanitasi HTML                   | ya                       |

Service di-inject lewat `CoreServices` saat membuat instance. Tidak ada
`window` global yang diakses langsung dari model.

### 5.6 Error dan disposal

- Semua subscription dikumpulkan di `DisposableBag`.
- `dispose()` urutan: batalkan async → lepas listener → putus observer →
  bersihkan DOM → kosongkan referensi.
- Error saat render ditangkap dan diubah menjadi state `error` yang dapat
  dirender, bukan membiarkan UI blank.
- Unhandled rejection di adapter wajib dilaporkan lewat event `errorOccurred`
  dan tidak boleh menelan error.

---

## 6. Alur data komponen

```text
User code
  │ options/props
  ▼
OptionsNormalizer ──► validation (dev) ──► normalized options
  │
  ▼
Model / state machine ◄──── interaction (keyboard, pointer, edit)
  │        │
  │        └──────────────► events (selectionChanged, etc.)
  ▼
DataController ──► DataSource.load(loadOptions)
  │                     │
  │                     ├─ local store → query pipeline
  │                     └─ remote store → network → normalize
  ▼
ViewModel (rows, columns, viewport, summaries)
  │
  ▼
Renderer + Virtualizer
  │
  ▼
DOM
```

Prinsip:

- Satu arah: input → state → view. Event keluar sebagai notifikasi.
- Renderer tidak pernah memanggil `DataSource` langsung.
- Perubahan yang memicu reload data melewati `DataController`, yang melakukan
  dedupe, cancel request lama, dan menjaga urutan hasil.
- Semua event dipancarkan **setelah** state konsisten.

---

## 7. Virtualisasi dan rendering performa

### 7.1 Virtualizer baris

- Default fixed row height; row height dapat diukur untuk mode variable.
- Range yang dirender = visible range + overscan (default 5 baris).
- Node baris didaur ulang; `key` menentukan apakah konten harus di-update.
- `aria-rowindex` memakai indeks absolut, bukan indeks DOM.
- Scroll anchoring: saat data berubah, pertahankan baris yang terlihat.

### 7.2 Virtualizer kolom

- Prefix sum lebar kolom + binary search untuk menentukan rentang.
- Kolom sticky (fixed) dirender di layer terpisah dengan sinkronisasi scroll.
- Shadow/border sticky dihitung dari state scroll, bukan layout read per frame.

### 7.3 Anggaran render

| Operasi                    | Budget  |
| -------------------------- | ------- |
| Render frame scroll        | ≤ 16 ms |
| Update satu baris          | ≤ 2 ms  |
| Update seleksi 1.000 baris | ≤ 50 ms |
| Rebuild kolom              | ≤ 30 ms |

Benchmark wajib ada di `apps/benchmarks` sebelum optimasi.

---

## 8. SSR dan import safety

- Tidak ada akses `window`/`document` di top-level module.
- Gunakan `isBrowser()` guard dan lazy init.
- Adapter hanya me-mount di lifecycle client.
- React: `useEffect`, bukan `useLayoutEffect` untuk mount awal.
- Vue: `onMounted`.
- Angular: `isPlatformBrowser` + `afterNextRender`.
- Output SSR: host element kosong + atribut minimal; tidak ada hydration
  markup parsial sampai ADR khusus.

---

## 9. Extension points

Dirancang sejak awal agar tidak perlu memodifikasi core:

| Extension               | Mekanisme                                            |
| ----------------------- | ---------------------------------------------------- |
| Custom store            | implementasi interface `Store<T>`                    |
| Custom column editor    | `editorTemplate` + `createEditor()`                  |
| Custom formatter        | `format` menerima fungsi/objek                       |
| Custom filter operator  | registry operator dengan validator & matcher murni   |
| Custom summary          | fungsi agregasi murni                                |
| Custom theme            | override CSS custom properties                       |
| Custom locale           | `messages` + `locale`                                |
| Custom renderer (chart) | renderer interface (`SvgRenderer`, `CanvasRenderer`) |
| Plugin lifecycle        | `use(plugin)` pada kernel (dibatasi, opt-in)         |

Semua extension **WAJIB** melalui kontrak publik dan tidak boleh mengakses
internal.

---

## 10. Keputusan arsitektur (ringkasan)

Semua keputusan berstatus **Accepted** per 2026-11-23.

| ID                                         | Keputusan                            | Alternatif               | Konsekuensi                             |
| ------------------------------------------ | ------------------------------------ | ------------------------ | --------------------------------------- |
| [ADR-0001](adr/0001-lisensi-apache-2.0.md) | Apache-2.0 + DCO                     | MIT, dual                | Perlu NOTICE & patent grant             |
| [ADR-0002](adr/0002-nama-dan-scope-npm.md) | Nama `SimpleUI`, scope `@simpleui/*` | nama lain                | Perlu verifikasi npm/trademark          |
| [ADR-0003](adr/0003-dukungan-jquery.md)    | jQuery bridge opsional, bukan core   | core jQuery              | Paket terpisah, ukuran core kecil       |
| [ADR-0004](adr/0004-rendering-engine.md)   | DOM engine bersama + adapter tipis   | headless, web components | Butuh template bridge & parity suite    |
| [ADR-0005](adr/0005-chart-engine.md)       | Chart scene graph sendiri            | D3, ECharts              | Kontrol penuh, effort besar             |
| [ADR-0006](adr/0006-matriks-dukungan.md)   | Matriks dukungan N/N-1 major         | dukungan tanpa batas     | Matriks diuji; versi EOL tidak didukung |
| [ADR-0007](adr/0007-runtime-validation.md) | Validator ringan internal            | zod/valibot              | Tanpa dependency, perlu pemeliharaan    |
| [ADR-0008](adr/0008-strategi-rilis.md)     | Fixed version group                  | independent              | Rilis sederhana, semua paket sinkron    |
| [ADR-0009](adr/0009-infrastruktur-test.md) | Vitest browser mode + Playwright     | jsdom saja               | Test lebih nyata, CI lebih berat        |
| [ADR-0010](adr/0010-strategi-css.md)       | CSS layer + custom properties        | CSS-in-JS                | CSP-friendly, tanpa runtime style       |
| [ADR-0011](adr/0011-format-build.md)       | ESM-first, UMD untuk CDN             | CJS-first                | Tooling modern, perlu UMD build         |

ADR lengkap dan catatan review ada di [index ADR](adr/README.md).

---

## 11. Risiko arsitektur

| Risiko                             | Dampak                              | Mitigasi                                       |
| ---------------------------------- | ----------------------------------- | ---------------------------------------------- |
| Template bridge terlalu kompleks   | Adapter rapuh, bug lintas framework | Spike DG-005, kontrak kecil, parity test       |
| Virtualizer variable height        | Scroll jump, perf buruk             | Mulai fixed height; ukur hanya saat diperlukan |
| Chart scene graph terlalu ambisius | Jadwal molor                        | Scope per jenis chart, renderer SVG dulu       |
| Angular Zone.js interaction        | Change detection loop               | `runOutsideAngular`, OnPush, test khusus       |
| SSR hydration mismatch             | Error di Next/Nuxt/Universal        | Host kosong, mount client-only, test SSR       |
| Dependency creep                   | Bundle & security                   | Budget, checklist §6.4, review ketat           |
| API terlalu besar di awal          | Beban maintenance                   | Public API minimal, experimental flag          |

---

## 12. Gate arsitektur

Sebelum DataGrid DG-1 dimulai, wajib terpenuhi:

- [x] ADR-0001…0011 disetujui (2026-11-23).
- [ ] Struktur package & dependency rule ditegakkan di CI.
- [ ] Spike virtualizer (DG-004) mencapai 100.000 baris pada 60 fps.
- [ ] Spike adapter bridge (DG-005) berhasil mount/update/unmount di React,
      Vue, dan Angular tanpa leak.
- [ ] Template bridge dapat merender template dari keempat target.
- [ ] Budget bundle awal terukur dan disepakati.
- [ ] Threat model DataGrid disetujui security reviewer.

---

_Lihat [02 — Adapter](02-adapter-cross-framework.md) untuk detail mekanisme
lintas framework, dan [03 — Data Layer](03-data-layer.md) untuk pipeline data._
