# 00 — Rule Umum SimpleUI

> **Status:** Draft v1.0 · **Berlaku sejak:** 2026-11-21 · **Owner:** Tech Lead
> **Sifat:** normatif. Pelanggaran aturan `WAJIB` harus diselesaikan sebelum
> merge, atau dicatat sebagai exception lewat ADR (lihat §14).
>
> Dokumen ini adalah **satu-satunya kontrak rekayasa umum** untuk SimpleUI.
> Aturan keamanan yang lebih rinci ada di [05 — Security](05-security.md),
> strategi test di [04 — Testing](04-testing-strategy.md), dan arsitektur di
> [01 — Arsitektur](01-arsitektur.md). Jika terjadi konflik, dokumen ini menang
> untuk urusan aturan, kecuali untuk topik yang secara eksplisit didelegasikan.

Kata kunci: **WAJIB** (mandatory), **DILARANG** (forbidden), **SEBAIKNYA**
(recommended), **BOLEH** (optional).

---

## 1. Ruang lingkup dan definisi

| Istilah | Definisi |
|---|---|
| **Core** | `@simpleui/core` — runtime framework-agnostic: lifecycle, state, DOM, data, i18n, security util |
| **Komponen** | Paket fitur (`datagrid`, `pivotgrid`, `charts`, dst.) yang dibangun di atas core |
| **Adapter** | Paket tipis per framework (`@simpleui/react`, `@simpleui/vue`, `@simpleui/angular`, `@simpleui/vanilla`) |
| **Consumer** | Aplikasi yang memakai SimpleUI |
| **Public API** | Simbol yang diekspor dari entry point paket dan tercatat di `.api.md` |
| **Internal** | Simbol dengan tag `@internal`, tidak diekspor, boleh berubah kapan saja |
| **Ideal day** | 1 hari kerja fokus seorang engineer, tanpa meeting/overhead |
| **DoD** | Definition of Done (§13) |

Aturan ini berlaku untuk seluruh kode di repo, termasuk `apps/`, `examples/`,
`tools/`, dan dokumentasi yang dapat dieksekusi.

---

## 2. Prinsip inti

### 2.1 Satu perilaku, banyak adapter

Logika bisnis komponen **WAJIB** berada di core/komponen, bukan di adapter.
Adapter hanya boleh: memetakan props → options, event → callback, template
framework → template bridge, dan mengelola lifecycle framework.

**DILARANG** membuat implementasi kedua dari sorting, filtering, virtualisasi,
seleksi, editing, atau aksesibilitas di paket adapter.

### 2.2 Security by default

Semua data, opsi, template, URL, dan respons jaringan dianggap **tidak
tepercaya**. Default harus aman tanpa konfigurasi tambahan. Fitur berisiko
(`allowHtml`, `withCredentials`, penyimpanan state) **WAJIB** opt-in dan
terdokumentasi.

### 2.3 Accessibility adalah functional requirement

Komponen interaktif **WAJIB** dapat dioperasikan penuh dengan keyboard, memiliki
nama aksesibel, fokus yang terlihat, dan lolos audit axe tanpa pelanggaran
serius. A11y bukan "nice to have" dan bukan pekerjaan QA di akhir.

### 2.4 Performance adalah fitur dengan budget

Setiap paket punya budget ukuran bundle dan target performa (§9). Regresi di atas
ambang **WAJIB** menggagalkan CI atau mendapat persetujuan tertulis.

### 2.5 API adalah produk

Public API **WAJIB** stabil, terdokumentasi, dan melalui review. Breaking change
hanya boleh terjadi di major version, dengan deprecation minimal dua minor
sebelumnya (§8).

### 2.6 Test adalah spesifikasi

Fitur dianggap belum ada sampai ada test yang membuktikan perilakunya. Bugfix
**WAJIB** disertai regression test yang gagal sebelum fix dan lulus sesudahnya.

### 2.7 Batas yang bersih

**DILARANG** ada import dari core ke framework, dari komponen ke adapter, atau
dari satu komponen ke komponen lain. Aturan lengkap di §3.

### 2.8 Determinisme

Perilaku tidak boleh bergantung pada waktu sistem, urutan object key, random
tanpa seed, atau locale mesin. Semua dependensi eksternal (waktu, random,
locale, timezone, jaringan) **WAJIB** dapat di-inject untuk test.

### 2.9 Permukaan dependency kecil

Setiap dependency runtime baru **WAJIB** melalui checklist §6.4. Target: core
tanpa dependency runtime pihak ketiga kecuali yang tidak dapat dihindari dan
telah disetujui lewat ADR.

### 2.10 Docs dan demo adalah bagian dari produk

Fitur **WAJIB** punya: TSDoc pada public API, minimal satu contoh di docs site,
entri changelog, dan (untuk komponen) demo interaktif.

### 2.11 Clean-room dan kepatuhan IP

**DILARANG**:

- menyalin source code, komentar, test, atau aset dari DevExtreme/DevExpress
  atau library komersial lain;
- memakai nama widget, nama opsi, teks dokumentasi, logo, atau trademark pihak
  ketiga secara identik tanpa kajian legal;
- melakukan decompile, membongkar bundle, atau menyalin implementasi internal
  produk berlisensi.

**WAJIB**:

- referensi perilaku berasal dari standar publik (WAI-ARIA, HTML, CSS, ECMAScript),
  dokumentasi publik, dan observasi black-box yang sah;
- mencatat sumber inspirasi di ADR bila ada kemiripan perilaku yang disengaja;
- melakukan license scan dan trademark check sebelum rilis 1.0.

---

## 3. Aturan arsitektur

### 3.1 Arah dependency

```text
apps/docs, examples, playgrounds
        │
        ▼
adapter-react / adapter-vue / adapter-angular / adapter-vanilla
        │
        ▼
datagrid / pivotgrid / charts / komponen lain
        │
        ▼
core  ◄──  theme, icons
        │
        ▼
platform (DOM, Intl, fetch) — tidak ada framework
```

Aturan:

- `R-ARC-01` **WAJIB**: core tidak mengimpor React, Vue, Angular, jQuery, atau
  paket komponen.
- `R-ARC-02` **WAJIB**: komponen hanya bergantung pada public API core.
- `R-ARC-03` **WAJIB**: adapter hanya bergantung pada core + komponen yang
  diadapterkan; tidak boleh saling bergantung antar adapter.
- `R-ARC-04` **DILARANG**: import lintas komponen (`datagrid` → `charts`).
  Integrasi lintas komponen dilakukan di aplikasi consumer atau paket
  integrasi terpisah.
- `R-ARC-05` **DILARANG**: circular dependency. Ditegakkan oleh
  `dependency-cruiser` dan `import/no-cycle`.
- `R-ARC-06` **WAJIB**: akses ke internal package melalui entry point publik;
  deep import diblokir oleh `exports` map.
- `R-ARC-07` **WAJIB**: semua akses `window`, `document`, `navigator`,
  `localStorage` dijaga (guard) dan tidak dieksekusi saat modul di-import.
- `R-ARC-08` **WAJIB**: setiap resource (listener, timer, observer, instance
  framework, DOM node) memiliki owner dan dibersihkan di `dispose()`.
- `R-ARC-09` **WAJIB**: CSS memakai prefix `sui-` dan CSS layer; tidak ada
  selector global yang tidak di-namespace.
- `R-ARC-10` **DILARANG**: singleton global yang menyimpan state antar instance,
  kecuali registry eksplisit yang terdokumentasi (mis. registry ikon).

### 3.2 Batas modul di dalam komponen

Setiap paket komponen **WAJIB** memisahkan:

| Folder | Tanggung jawab | Boleh bergantung pada |
|---|---|---|
| `src/model/` | state, tipe, state machine, selector murni | `core` |
| `src/data/` | LoadOptions, pipeline, cache | `core`, `model` |
| `src/view/` | renderer DOM, virtualizer, layout | `model`, `core` |
| `src/interaction/` | keyboard, pointer, selection, editing | `model`, `view`, `core` |
| `src/api/` | public class, opsi, event, export | semua di atas |
| `src/index.ts` | barrel publik saja | `api` |

`R-ARC-11` **DILARANG**: `model` mengimpor `view` atau `interaction`.
`R-ARC-12` **DILARANG**: renderer mengakses data source secara langsung; semua
lewat controller/model.

### 3.3 Enforcement

| Aturan | Alat | Gate |
|---|---|---|
| Dependency & cycle | `dependency-cruiser` | CI `lint:arch` |
| Framework leak | ESLint `no-restricted-imports` per paket | CI `lint` |
| Deep import | `exports` map + `publint` + `arethetypeswrong` | CI `build` |
| Public API berubah | API Extractor `.api.md` | CI `api:check` |
| Bundle size | `size-limit` | CI `size` |
| Lisensi dependency | `license-checker` + allowlist | CI `license` |

---

## 4. Clean code dan aturan TypeScript

### 4.1 Batas ukuran

| Elemen | Batas lunak | Batas keras | Catatan |
|---|---|---|---|
| File | 300 LOC | 500 LOC | Pindahkan ke modul terpisah |
| Fungsi/method | 40 LOC | 60 LOC | Ekstrak helper murni |
| Parameter fungsi | 3 | 4 | Lebih dari itu pakai options object |
| Cyclomatic complexity | 8 | 12 | Pecah percabangan |
| Kedalaman nesting | 3 | 4 | Early return |
| Baris di dalam komponen | 250 | 400 | Komposisi |

Batas keras **WAJIB** ditegakkan lewat ESLint, bukan sekadar review.

### 4.2 Penamaan

| Jenis | Konvensi | Contoh |
|---|---|---|
| File | `kebab-case.ts` | `column-model.ts` |
| Tipe/interface/class | `PascalCase` | `DataGridOptions` |
| Fungsi/variabel | `camelCase` | `normalizeColumns()` |
| Konstanta | `UPPER_SNAKE_CASE` | `MAX_FILTER_DEPTH` |
| Event | `pastTense` / `noun + Changed` | `selectionChanged`, `rowUpdated` |
| Opsi publik | `camelCase` | `showColumnLines` |
| CSS class | `sui-<komponen>-<elemen>--<state>` | `sui-grid-cell--focused` |
| CSS token | `--sui-<kategori>-<nama>-<varian>` | `--sui-color-accent-default` |
| Test | `should <behavior> when <condition>` | `should keep selection when data reloads` |

`R-CODE-01` **DILARANG**: singkatan yang tidak lazim (`usr`, `mgr`, `cfg`).
`R-CODE-02` **DILARANG**: boolean flag parameter tanpa nama
(`render(true, false)`); gunakan options object.
`R-CODE-03` **WAJIB**: nama menjelaskan *mengapa/tujuan*, bukan tipe
(`rows` lebih baik dari `dataArray`).

### 4.3 Konfigurasi TypeScript wajib

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

Aturan tipe:

- `R-TS-01` **DILARANG** `any`. Gunakan `unknown` + narrowing, atau generic.
  Pengecualian hanya di file deklarasi pihak ketiga dan wajib
  `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- alasan`.
- `R-TS-02` **DILARANG** `@ts-ignore`. Gunakan `@ts-expect-error` dengan alasan.
- `R-TS-03` **DILARANG** non-null assertion (`!`) kecuali setelah runtime guard
  yang jelas dan diberi komentar.
- `R-TS-04` **WAJIB**: union string untuk nilai tertutup; hindari `enum`
  (kecuali `const enum` internal yang tidak diekspor).
- `R-TS-05` **WAJIB**: `interface` untuk bentuk objek publik yang dapat
  di-extend; `type` untuk union/intersection/utility.
- `R-TS-06` **WAJIB**: generic pada komponen data (`DataGrid<T>`) agar consumer
  mendapat type-safety penuh.
- `R-TS-07` **DILARANG** mengekspor tipe internal yang mengandung implementasi
  (`Map`, `Set`, class internal) dari public API.
- `R-TS-08` **WAJIB**: semua public API punya TSDoc dengan `@example` minimal
  untuk method utama.

### 4.4 Immutability dan state

- `R-STATE-01` **WAJIB**: state publik dibaca sebagai `readonly`/`ReadonlySet`.
- `R-STATE-02` **WAJIB**: perubahan state melalui action/method, bukan mutasi
  objek dari luar.
- `R-STATE-03` **WAJIB**: update dibatch; render dijadwalkan sekali per frame
  (atau microtask), bukan per perubahan.
- `R-STATE-04` **DILARANG**: deep clone data pengguna secara membabi buta.
  Clone hanya struktur yang dimiliki komponen.
- `R-STATE-05` **WAJIB**: `beginUpdate()`/`endUpdate()` aman terhadap nested
  call dan `try/finally`.

### 4.5 Fungsi murni dan efek samping

- Logika sorting, filtering, grouping, agregasi, formatting, dan matematika
  virtualisasi **WAJIB** berupa fungsi murni di `model/` atau `data/`.
- Efek samping (DOM, network, storage) **WAJIB** diisolasi di service/adapter
  dengan interface yang dapat di-mock.
- `Date.now()`, `Math.random()`, `crypto.randomUUID()`, `Intl`, dan timezone
  **WAJIB** dapat di-inject lewat service (`Clock`, `IdGenerator`, `Locale`).

### 4.6 Penanganan error

```ts
export class SimpleUIError extends Error {
  readonly code: SimpleUIErrorCode;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
}
```

- `R-ERR-01` **WAJIB**: error yang diharapkan (validasi input, network, parsing)
  dikembalikan sebagai `Result<T, E>` atau error terklasifikasi; jangan
  melempar error untuk alur normal.
- `R-ERR-02` **WAJIB**: error pemrograman (invariant dilanggar) boleh `throw`,
  dengan pesan yang menyebut nama invariant.
- `R-ERR-03` **DILARANG** `catch {}` kosong. Minimal log terstruktur atau
  rethrow dengan konteks.
- `R-ERR-04` **WAJIB**: pesan untuk pengguna melalui i18n; pesan internal tidak
  boleh membocorkan path, token, URL internal, atau stack trace di production.
- `R-ERR-05` **WAJIB**: error memiliki `code` stabil yang terdokumentasi
  (mis. `SUI-DG-001`) dan tidak berubah tanpa major version.
- `R-ERR-06` **DILARANG** mencatat payload data pengguna ke console/log.
- `R-ERR-07` **WAJIB**: operasi async yang dapat dibatalkan menerima
  `AbortSignal` dan tidak mengubah state setelah dibatalkan.

### 4.7 Komentar dan dokumentasi kode

- Komentar menjelaskan **mengapa**, bukan **apa**. Kode yang butuh komentar
  "apa" sebaiknya disederhanakan.
- `TODO` **WAJIB** menyertakan issue/task ID: `// TODO(DG-032): ...`.
- `FIXME` **DILARANG** masuk ke branch `main`; selesaikan atau buat issue.
- API publik **WAJIB** TSDoc; internal cukup komentar singkat.
- Jangan meninggalkan kode mati, `console.log`, atau debugger.

### 4.8 Anti-pattern yang dilarang

| Anti-pattern | Alasan | Alternatif |
|---|---|---|
| `innerHTML` dengan data | XSS | `textContent` / sanitizer |
| `eval`, `new Function` | CSP & injection | parser ekspresi aman |
| Deep merge tanpa guard | prototype pollution | `safeMerge` |
| `setTimeout` untuk sinkronisasi UI | flaky & boros | scheduler/`requestAnimationFrame` |
| Global event listener per instance | memory leak | delegated listener + dispose |
| `JSON.parse` langsung dipercaya | data korup | validasi skema |
| `Array.prototype.sort` pada state | mutasi tak terduga | salin dulu |
| `any` di boundary | kehilangan type safety | schema validation |
| Loki/Imperative DOM di adapter | duplikasi perilaku | template bridge |
| Snapshot test untuk logika | rapuh | assertion perilaku |

---

## 5. Aturan API dan kompatibilitas

### 5.1 Prinsip public API

- `R-API-01` **WAJIB**: public API minimal; setiap simbol baru harus punya
  alasan penggunaan yang jelas.
- `R-API-02` **WAJIB**: nama opsi/event **identik** di semua framework; adapter
  hanya mengubah konvensi penulisan (camelCase → kebab-case untuk Vue/Angular
  template).
- `R-API-03` **WAJIB**: opsi yang mengubah perilaku ke mode tidak aman diberi
  nama eksplisit (`allowHtml`, `withCredentials`) dan default `false`.
- `R-API-04` **WAJIB**: event mengirim payload bertipe dan tidak membocorkan
  objek internal yang dapat dimutasi.
- `R-API-05` **WAJIB**: API async mengembalikan `Promise` yang dapat
  dibatalkan bila operasinya panjang.

### 5.2 Pemetaan lintas framework

| Konsep | JavaScript/TS | React | Vue | Angular |
|---|---|---|---|---|
| Opsi | `options` object | props | props | `@Input()` |
| Event | `instance.on('cellClick')` | `onCellClick` | `@cell-click` | `(cellClick)` |
| Two-way | `option('value', v)` | `value` + `onValueChange` | `v-model` | `[(value)]` |
| Template | function | render prop | slot | `ng-template` |
| Instance | return constructor | `ref` | `defineExpose` | `@ViewChild` |
| Dispose | `dispose()` | unmount | unmount | `ngOnDestroy` |

### 5.3 Semver dan deprecation

- Sebelum 1.0: versi `0.x`, API boleh berubah dengan changelog yang jelas.
- Sejak 1.0: `MAJOR.MINOR.PATCH` standar semver.
- Deprecation: tandai `@deprecated` + alternatif + sejak versi; pertahankan
  minimal **2 minor** sebelum dihapus di major berikutnya.
- Setiap PR yang mengubah public API **WAJIB** menyertakan changeset dan
  memperbarui `.api.md`.
- Semua paket dalam grup rilis memakai versi yang sama (fixed group) agar
  matriks kompatibilitas sederhana.

### 5.4 Browser dan SSR

- Modul **WAJIB** import-safe di environment tanpa DOM (Node/SSR).
- Komponen **WAJIB** hanya menyentuh DOM setelah `mount()`/`onMounted`/`useEffect`.
- SSR awal: render host kosong, mount di client. Hydration markup parsial belum
  didukung sampai ada ADR terpisah.
- `R-API-06` **DILARANG** memakai API browser non-standar tanpa polyfill/guard.

---

## 6. Aturan keamanan (ringkasan wajib)

Threat model lengkap dan kontrol per permukaan ada di
[05 — Security](05-security.md). Aturan berikut **WAJIB** dipatuhi di setiap PR.

| ID | Aturan |
|---|---|
| `R-SEC-01` | Semua data dari luar (API, props, URL, storage, clipboard) tidak tepercaya. |
| `R-SEC-02` | Render teks dengan `textContent`/text node. `innerHTML` **DILARANG** kecuali lewat sanitizer resmi dan `allowHtml: true`. |
| `R-SEC-03` | Sanitizer memakai allowlist tag/atribut, memblokir event handler, `script`, `style`, dan protokol berbahaya; integrasikan Trusted Types bila tersedia. |
| `R-SEC-04` | **DILARANG** `eval`, `new Function`, `setTimeout(string)`, atau parser ekspresi yang mengeksekusi kode. |
| `R-SEC-05` | Merge opsi memakai `safeMerge`: tolak `__proto__`, `constructor`, `prototype`; gunakan object tanpa prototype untuk dictionary. |
| `R-SEC-06` | URL divalidasi terhadap allowlist protokol (`https:`, `http:`, `mailto:`, `tel:`); blokir `javascript:`, `data:`, `vbscript:`; normalisasi spasi/control char. |
| `R-SEC-07` | Export CSV/Excel meng-escape formula (`=`, `+`, `-`, `@`, TAB, CR) secara default. |
| `R-SEC-08` | **DILARANG** inline event handler (`onclick=`) dan `<style>` yang di-inject dari data. Stylet via CSSOM/class, bukan string HTML. |
| `R-SEC-09` | Tidak ada telemetry, cookie, atau request pihak ketiga secara default. |
| `R-SEC-10` | State persistence opt-in, divalidasi skema, dibatasi ukuran, dan tidak menyimpan data sensitif secara default. |
| `R-SEC-11` | Network: HTTPS default, timeout, batas ukuran respons, `AbortSignal`, CSRF token provider, credentials opt-in. |
| `R-SEC-12` | Batas DoS: jumlah baris/kolom, kedalaman filter/group, panjang ekspresi, ukuran sel, jumlah request paralel. |
| `R-SEC-13` | Dependency baru melalui checklist §6.4; lockfile committed; `ignore-scripts=true`. |
| `R-SEC-14` | Setiap fitur yang menyentuh HTML/URL/export/storage wajib punya security test. |
| `R-SEC-15` | Otorisasi adalah tanggung jawab server. UI hanya menyembunyikan, bukan melindungi. Dokumentasikan eksplisit. |
| `R-SEC-16` | Export dan clipboard menghormati kolom tersembunyi dan hak akses yang dikonfigurasi. |
| `R-SEC-17` | Pesan error production tidak memuat stack, path, token, atau detail internal. |
| `R-SEC-18` | `postMessage` (jika dipakai) wajib cek `origin` dan `source`, serta validasi payload. |

### 6.1 Contoh: render sel yang aman

```ts
// BENAR — data diperlakukan sebagai teks
cell.textContent = String(value ?? '');

// SALAH — XSS
cell.innerHTML = String(value);
```

### 6.2 Contoh: merge opsi yang aman

```ts
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function safeMerge<T extends object>(target: T, source: Partial<T>): T {
  for (const [key, value] of Object.entries(source)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (isPlainObject(value) && isPlainObject(target[key])) {
      safeMerge(target[key] as object, value as object);
    } else {
      (target as Record<string, unknown>)[key] = value;
    }
  }
  return target;
}
```

### 6.3 Contoh: URL aman

```ts
const ALLOWED = new Set(['https:', 'http:', 'mailto:', 'tel:']);

export function safeUrl(input: string, base = document.baseURI): string | null {
  const trimmed = input.trim();
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed, base);
    return ALLOWED.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
```

### 6.4 Checklist dependency baru

Sebelum menambah dependency runtime, jawab di PR:

1. Apakah bisa diimplementasikan < 200 LOC tanpa risiko?
2. Lisensi permisif dan tidak ada klausa aneh?
3. Ukuran gzip dan dampaknya ke budget?
4. Apakah actively maintained (rilis 12 bulan terakhir)?
5. Apakah punya riwayat CVE? Bagaimana respons maintainer?
6. Apakah punya install script? (harus dimatikan)
7. Apakah bisa di-tree-shake?
8. Apakah perlu di-bundle atau bisa peer dependency?
9. Apakah ada alternatif yang sudah dipakai?
10. Siapa yang bertanggung jawab memantau update?

---

## 7. Aturan testing

Detail tooling dan matriks ada di [04 — Testing](04-testing-strategy.md).

### 7.1 Piramida

| Layer | Proporsi | Tool | Contoh |
|---|---|---|---|
| Unit (murni) | 60% | Vitest | sorting, filter, agregasi, virtual math |
| Component/DOM | 25% | Vitest browser mode / Testing Library | render, keyboard, selection |
| Integration/contract | 10% | Vitest + per-framework harness | adapter parity |
| E2E/visual/a11y/perf | 5% | Playwright + axe | alur nyata, screenshot, audit |

### 7.2 Coverage gate

| Paket | Lines | Branches | Catatan |
|---|---|---|---|
| `core` | ≥ 90% | ≥ 85% | Mutation score ≥ 70% untuk modul kritis |
| Komponen | ≥ 85% | ≥ 80% | Data pipeline & state machine wajib ≥ 90% |
| Adapter | ≥ 80% | ≥ 75% | Termasuk cleanup & remount |
| Keseluruhan | ≥ 85% | ≥ 80% | Tidak boleh turun > 1% per PR |

Coverage bukan tujuan, tetapi **regresi coverage menggagalkan CI**.

### 7.3 Aturan penulisan test

- `R-TEST-01` **WAJIB**: satu test menguji satu perilaku; nama menjelaskan
  perilaku, bukan nama method.
- `R-TEST-02` **DILARANG**: snapshot untuk logika/behavior. Snapshot hanya untuk
  markup visual yang stabil dan disertai alasan.
- `R-TEST-03` **WAJIB**: test deterministik — fake timer, seeded random,
  timezone eksplisit, locale eksplisit.
- `R-TEST-04` **WAJIB**: setiap test membersihkan DOM, listener, dan instance.
- `R-TEST-05` **DILARANG** `test.only`/`describe.only` di `main`.
- `R-TEST-06` **WAJIB**: bugfix punya test yang gagal sebelum fix.
- `R-TEST-07` **WAJIB**: fitur interaktif punya minimal satu keyboard test dan
  satu axe test.
- `R-TEST-08` **WAJIB**: adapter punya test mount → update → unmount tanpa leak.
- `R-TEST-09` **WAJIB**: fitur HTML/URL/export/storage punya test payload
  berbahaya.
- `R-TEST-10` **WAJIB**: performance test untuk perubahan di hot path
  (virtualisasi, data pipeline, render).

### 7.4 Definition of Done untuk test

Sebuah task hanya boleh `DONE` jika:

- unit test untuk logika baru ada dan lulus;
- test regresi untuk bug yang diperbaiki ada;
- test adapter (jika menyentuh adapter) ada;
- a11y test (jika interaktif) ada;
- security test (jika menyentuh permukaan berisiko) ada;
- tidak menurunkan coverage di bawah gate;
- tidak ada test flaky yang di-quarantine tanpa issue.

---

## 8. Aturan performa

### 8.1 Budget bundle (gzip, tree-shaken)

| Paket | Budget | Catatan |
|---|---|---|
| `@simpleui/core` | ≤ 25 KB | Tanpa komponen |
| `@simpleui/datagrid` | ≤ 70 KB | Fitur MVP |
| `@simpleui/pivotgrid` | ≤ 50 KB | |
| `@simpleui/charts` (cartesian) | ≤ 90 KB | Tanpa seri tambahan |
| Adapter (masing-masing) | ≤ 5 KB | Thin wrapper |
| CSS tema | ≤ 30 KB | Termasuk dark/HC |

### 8.2 Target runtime (reference device: laptop mid-range, Chrome stable)

| Skenario | Target |
|---|---|
| Mount DataGrid 10.000 baris lokal | ≤ 300 ms |
| Scroll frame (virtualized) | ≤ 16 ms (60 fps) |
| Sorting 100.000 baris lokal | ≤ 150 ms |
| Filter 100.000 baris | ≤ 100 ms |
| Update satu sel | ≤ 5 ms |
| Memory 100.000 baris remote | ≤ 150 MB |
| Chart render 10.000 titik | ≤ 500 ms |
| Chart update 60 fps | ≤ 16 ms/frame |

### 8.3 Aturan implementasi

- `R-PERF-01` **WAJIB**: hindari layout thrashing; batch baca DOM lalu tulis.
- `R-PERF-02` **WAJIB**: gunakan `ResizeObserver`, bukan polling resize.
- `R-PERF-03` **WAJIB**: listener scroll/resize memakai `{ passive: true }` bila
  memungkinkan.
- `R-PERF-04` **DILARANG**: membuat ulang seluruh DOM saat selection/focus
  berubah; update class/atribut secara targeted.
- `R-PERF-05` **WAJIB**: virtualisasi untuk data > 100 baris atau > 30 kolom.
- `R-PERF-06` **WAJIB**: operasi berat (> 16 ms) di-offload ke worker atau
  dipecah dengan `scheduler.yield()`/chunking.
- `R-PERF-07` **WAJIB**: ukur sebelum optimasi; sertakan benchmark sebelum/sesudah
  di PR untuk perubahan hot path.
- `R-PERF-08` **DILARANG** menambahkan dependency besar hanya untuk kenyamanan.

---

## 9. Aturan aksesibilitas

Target: **WCAG 2.2 Level AA**.

- `R-A11Y-01` **WAJIB**: semua fungsi dapat dioperasikan dengan keyboard.
- `R-A11Y-02` **WAJIB**: fokus terlihat jelas (kontras ≥ 3:1 terhadap sekitar).
- `R-A11Y-03` **WAJIB**: tidak ada keyboard trap; `Esc` menutup overlay.
- `R-A11Y-04` **WAJIB**: gunakan pola ARIA yang benar (grid, dialog, menu,
  tooltip, tabs) dan jangan menambah ARIA yang salah.
- `R-A11Y-05` **WAJIB**: kontras teks ≥ 4.5:1, komponen UI ≥ 3:1.
- `R-A11Y-06` **WAJIB**: target sentuh minimal 24×24 CSS px (WCAG 2.2).
- `R-A11Y-07` **WAJIB**: hormati `prefers-reduced-motion`; animasi tidak
  menghalangi.
- `R-A11Y-08` **WAJIB**: status dinamis diumumkan lewat live region yang
  di-throttle, tidak spam.
- `R-A11Y-09` **WAJIB**: chart menyediakan alternatif data tabel atau ringkasan
  teks.
- `R-A11Y-10` **WAJIB**: uji dengan keyboard-only + screen reader (NVDA atau
  VoiceOver) sebelum GA.

---

## 10. Aturan dokumentasi

- `R-DOC-01` **WAJIB**: TSDoc untuk semua public API, termasuk `@example`.
- `R-DOC-02` **WAJIB**: setiap komponen punya halaman: overview, cara pakai,
  API reference, contoh per framework, aksesibilitas, dan catatan keamanan.
- `R-DOC-03` **WAJIB**: contoh kode harus dapat dijalankan; snippet di docs
  diuji lewat `tsc`/playground.
- `R-DOC-04` **WAJIB**: changelog per paket, ditulis untuk consumer (bukan commit
  log mentah).
- `R-DOC-05` **WAJIB**: breaking change punya migration guide + codemod bila
  memungkinkan.
- `R-DOC-06` **WAJIB**: dokumen berbahasa Indonesia untuk perencanaan; kode,
  nama API, komentar kode, dan commit message berbahasa Inggris.
- `R-DOC-07` **DILARANG**: dokumentasi yang menyebut fitur belum ada tanpa label
  "planned".

---

## 11. Git, PR, dan review

### 11.1 Branching

- Trunk-based: `main` selalu releasable.
- Branch: `feat/dg-column-model`, `fix/dg-selection-leak`,
  `docs/adapter-guide`, `chore/ci-cache`.
- Umur branch ≤ 3 hari kerja; PR kecil lebih baik.
- **DILARANG** force-push ke `main`.

### 11.2 Commit

Conventional Commits:

```text
feat(datagrid): add multi-column sorting
fix(core): dispose resize observer on unmount
docs(security): document CSV injection mitigation
test(datagrid): cover selection across data reload
chore(ci): cache pnpm store
```

Scope = nama paket/area. Commit message berbahasa Inggris, imperatif.

### 11.3 Pull request

- Ukuran ideal ≤ 400 LOC perubahan (tanpa generated file).
- **WAJIB** mengisi template PR: ringkasan, risiko, cara test, screenshot
  (untuk UI), checklist security & a11y, task ID.
- **WAJIB** changeset untuk perubahan yang memengaruhi consumer.
- **WAJIB** CI hijau sebelum review final.
- Reviewer: 1 untuk perubahan biasa; 2 untuk `core`, security-sensitive,
  public API, atau arsitektur.
- **DILARANG** merge dengan `TODO` kritis, test `skip`, atau penurunan coverage
  tanpa persetujuan.

### 11.4 Review checklist

Lihat [PR checklist](11-templates/pr-checklist.md). Reviewer **WAJIB** memeriksa:

1. Apakah perilaku berada di layer yang benar?
2. Apakah ada duplikasi logika di adapter?
3. Apakah input tidak tepercaya di-render aman?
4. Apakah semua resource dibersihkan?
5. Apakah keyboard & ARIA benar?
6. Apakah test membuktikan perilaku, termasuk edge case?
7. Apakah public API berubah? Changeset & `.api.md`?
8. Apakah performa tetap dalam budget?
9. Apakah docs/demo diperbarui?
10. Apakah ada dependency baru? Checklist §6.4?

---

## 12. Definition of Done (DoD)

Sebuah task/PR dianggap selesai hanya jika **semua** berlaku:

- [ ] Kode mengikuti aturan di dokumen ini dan lolos lint/typecheck.
- [ ] Public API (jika ada) punya TSDoc, tipe yang benar, dan `.api.md`
      diperbarui.
- [ ] Unit test untuk logika baru; regression test untuk bug.
- [ ] Test adapter untuk perubahan yang menyentuh adapter.
- [ ] Test keyboard + axe untuk fitur interaktif.
- [ ] Security test untuk HTML/URL/export/storage/network.
- [ ] Performance tetap dalam budget; benchmark disertakan jika hot path.
- [ ] Tidak ada memory leak (mount/unmount berulang).
- [ ] Tidak ada `any`, `@ts-ignore`, `console.log`, kode mati, atau `TODO`
      tanpa ID.
- [ ] Changeset dibuat (jika consumer-facing).
- [ ] Dokumentasi + contoh diperbarui.
- [ ] Demo/playground berfungsi di 4 adapter (jika komponen).
- [ ] Review disetujui; CI hijau.
- [ ] Task ID diperbarui di `tasks.md` menjadi `DONE` dengan link PR.

---

## 13. Exception dan ADR

Pengecualian terhadap aturan **WAJIB** hanya boleh melalui ADR yang disetujui
tech lead (dan security reviewer untuk `R-SEC-*`). ADR minimal memuat:

- konteks & aturan yang dilanggar;
- alasan kuat (bukan kenyamanan);
- risiko dan mitigasi;
- masa berlaku (review date);
- rencana perbaikan bila ada.

Tanpa ADR, pelanggaran **WAJIB** ditolak di review.

---

## 14. Ringkasan checklist cepat

**Sebelum menulis kode**

- [ ] Task ID jelas dan scope kecil.
- [ ] Layer penempatan benar (model/data/view/interaction/api).
- [ ] Risiko security & a11y diidentifikasi.

**Saat menulis kode**

- [ ] Tidak ada `any`, `eval`, `innerHTML` dengan data.
- [ ] Resource punya owner dan cleanup.
- [ ] Error punya code dan tidak membocorkan detail.
- [ ] Nama jelas, fungsi kecil, tanpa duplikasi.

**Sebelum PR**

- [ ] Test (unit + edge case) lulus.
- [ ] Lint, typecheck, build, size lulus.
- [ ] Docs & changeset.
- [ ] Self-review diff.

**Saat review**

- [ ] Perilaku di layer benar.
- [ ] Security & a11y tidak diregresi.
- [ ] Test membuktikan, bukan sekadar mengeksekusi.
- [ ] Tidak ada dependency baru tanpa justifikasi.

---

*Dokumen ini ditinjau setiap akhir phase. Perubahan aturan wajib melalui PR
dengan 2 reviewer dan catatan di changelog dokumentasi.*
