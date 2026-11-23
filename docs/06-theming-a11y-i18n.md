# 06 — Theming, Accessibility, dan i18n

> **Status:** Draft v1.0 · **Owner:** Design System Lead · **Reviewer:** A11y champion
> **Prasyarat:** [00 — Rule Umum §9–10](00-rule-umum.md#9-aturan-aksesibilitas)

---

## 1. Design system

### 1.1 Prinsip

1. **Token-first** — warna, spacing, tipografi, radius, shadow, z-index berasal
   dari token; tidak ada nilai hardcoded di komponen.
2. **CSS-native** — CSS custom properties + `@layer`; tanpa CSS-in-JS runtime.
3. **Themeable tanpa rebuild** — consumer dapat override token di level root
   atau per komponen.
4. **A11y by default** — kontras, fokus, target size, dan motion sudah benar di
   tema default.
5. **RTL dan density** adalah varian first-class, bukan tambalan.

### 1.2 Layer CSS

```css
@layer simpleui.reset,
       simpleui.tokens,
       simpleui.base,
       simpleui.component,
       simpleui.utilities;
```

- `reset`: normalisasi minimal, scoped.
- `tokens`: definisi variabel.
- `base`: styling elemen dasar komponen.
- `component`: style per komponen.
- `utilities`: helper terbatas (mis. `.sui-visually-hidden`).

Aturan:

- **DILARANG** style global yang memengaruhi elemen di luar `.sui-*`.
- **DILARANG** `!important` kecuali untuk `.sui-visually-hidden` dan override
  aksesibilitas yang terdokumentasi.
- Selector maksimum 3 level; hindari selector berbasis struktur DOM yang rapuh.

### 1.3 Token

Format nama:

```text
--sui-<kategori>-<nama>[-<varian>]
```

Kategori:

| Kategori  | Contoh                                                                             |
| --------- | ---------------------------------------------------------------------------------- |
| `color`   | `--sui-color-bg-surface`, `--sui-color-text-primary`, `--sui-color-accent-default` |
| `space`   | `--sui-space-1` … `--sui-space-12` (skala 4px)                                     |
| `font`    | `--sui-font-family-base`, `--sui-font-size-md`, `--sui-font-weight-semibold`       |
| `line`    | `--sui-line-height-tight`, `--sui-line-height-normal`                              |
| `radius`  | `--sui-radius-sm`, `--sui-radius-md`, `--sui-radius-full`                          |
| `shadow`  | `--sui-shadow-sm`, `--sui-shadow-overlay`                                          |
| `border`  | `--sui-border-width`, `--sui-border-color`                                         |
| `focus`   | `--sui-focus-ring-color`, `--sui-focus-ring-width`, `--sui-focus-ring-offset`      |
| `z`       | `--sui-z-dropdown`, `--sui-z-modal`, `--sui-z-toast`                               |
| `motion`  | `--sui-motion-duration-fast`, `--sui-motion-ease-standard`                         |
| `density` | `--sui-density-row-height`, `--sui-density-cell-padding`                           |

Contoh definisi:

```css
:root,
.sui-theme {
  --sui-color-bg-surface: #ffffff;
  --sui-color-text-primary: #1a1a1a;
  --sui-color-accent-default: #0b5fff;
  --sui-space-2: 8px;
  --sui-radius-md: 6px;
  --sui-focus-ring-color: #0b5fff;
  --sui-focus-ring-width: 2px;
  --sui-focus-ring-offset: 2px;
  --sui-motion-duration-fast: 120ms;
}

.sui-theme[data-theme='dark'] {
  --sui-color-bg-surface: #16181d;
  --sui-color-text-primary: #f2f4f8;
  --sui-color-accent-default: #7aa7ff;
}

.sui-theme[data-density='compact'] {
  --sui-density-row-height: 28px;
  --sui-density-cell-padding: 4px 8px;
}
```

### 1.4 Tema

- Tema dipilih dengan `data-theme="light|dark|high-contrast"` pada root
  `.sui-theme`.
- Default mengikuti `prefers-color-scheme` bila `data-theme` tidak diset.
- `high-contrast` juga menghormati `forced-colors: active`.
- Consumer dapat membuat tema sendiri dengan override token; tidak perlu
  mengubah CSS komponen.
- **DILARANG** memuat font dari CDN pihak ketiga secara default.

### 1.5 Density

| Density       | Row height | Padding   | Penggunaan      |
| ------------- | ---------- | --------- | --------------- |
| `comfortable` | 40px       | 10px 12px | Default desktop |
| `compact`     | 28px       | 4px 8px   | Data-heavy      |
| `spacious`    | 48px       | 14px 16px | Touch/mobile    |

Density diterapkan lewat token, bukan class per sel.

### 1.6 RTL

- Gunakan properti logis: `margin-inline-start`, `padding-inline-end`,
  `inset-inline-start`, `border-start-start-radius`.
- **DILARANG** `left/right` hardcoded untuk layout komponen.
- Ikon arah (chevron, sort) di-mirror hanya jika maknanya arah.
- `dir="rtl"` pada container; deteksi otomatis dari `getComputedStyle`.
- Test visual RTL untuk setiap komponen.

### 1.7 Motion

- Durasi default 120–200 ms; easing standar.
- Hormati `prefers-reduced-motion: reduce` → durasi 0, tanpa animasi posisi.
- Animasi tidak boleh menunda akses ke konten.
- Tidak ada animasi infinite yang mengganggu.

### 1.8 Ikon

- SVG inline, `currentColor`, `aria-hidden="true"` untuk dekoratif.
- Ikon fungsional punya label aksesibel.
- Tree-shakeable; tidak ada sprite global yang dimuat otomatis.
- **DILARANG** memuat ikon dari URL eksternal saat runtime.

### 1.9 Print

- Stylesheet `@media print` per komponen.
- Sembunyikan kontrol interaktif, tampilkan data lengkap (bukan virtualized).
- Page break di group/header; header tabel berulang.
- Warna aman untuk cetak hitam-putih.

---

## 2. Accessibility

Target: **WCAG 2.2 Level AA**, dengan beberapa elemen AAA bila murah
(mis. kontras tinggi pada teks utama).

### 2.1 Fondasi

| Kebutuhan   | Implementasi                                                                |
| ----------- | --------------------------------------------------------------------------- |
| Keyboard    | Semua fungsi; roving tabindex untuk grid; focus trap untuk dialog           |
| Fokus       | `:focus-visible` dengan ring 3:1; fokus dipulihkan setelah dialog           |
| Nama        | `aria-label`/`aria-labelledby`; caption tabel                               |
| Peran       | `role="grid"`, `row`, `columnheader`, `gridcell`, `dialog`, `menu`          |
| State       | `aria-selected`, `aria-sort`, `aria-expanded`, `aria-disabled`, `aria-busy` |
| Live region | Perubahan sort/filter/page/selection diumumkan (throttle 500 ms)            |
| Kontras     | Teks 4.5:1; UI 3:1; fokus 3:1                                               |
| Target      | Minimum 24×24 px; ideal 44×44 px untuk touch                                |
| Motion      | `prefers-reduced-motion`                                                    |
| Zoom        | 200% tanpa kehilangan konten; reflow 320px                                  |

### 2.2 Pola per komponen

| Komponen          | Pola ARIA                              | Catatan                                                                    |
| ----------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| DataGrid          | WAI-ARIA Grid                          | `aria-rowcount`, `aria-colcount`, `aria-rowindex`, `aria-colindex` absolut |
| PivotGrid         | Grid + tree                            | Header bertingkat, `aria-expanded` untuk expand/collapse                   |
| Chart             | `figure` + data table alternatif       | Navigasi titik data dengan keyboard, ringkasan teks                        |
| Dialog/Popup      | `role="dialog"` + `aria-modal`         | Focus trap, `Esc`, restore focus                                           |
| Menu/Context menu | `role="menu"`/`menuitem`               | Arrow keys, type-ahead, `Esc`                                              |
| Tooltip           | `role="tooltip"` + `aria-describedby`  | Muncul pada hover dan focus; dapat ditutup `Esc`                           |
| Tabs              | `role="tablist"`                       | Arrow keys, `aria-selected`, panel `aria-labelledby`                       |
| Tree              | `role="tree"`                          | Arrow keys, `aria-expanded`, `aria-level`                                  |
| Form editor       | Label + `aria-invalid` + error message | Error diumumkan via live region                                            |

### 2.3 Keyboard map DataGrid (ringkas)

| Tombol                   | Aksi                         |
| ------------------------ | ---------------------------- |
| `Tab` / `Shift+Tab`      | Masuk/keluar grid            |
| `Arrow`                  | Pindah sel                   |
| `Home` / `End`           | Awal/akhir baris             |
| `Ctrl+Home` / `Ctrl+End` | Awal/akhir grid              |
| `PageUp` / `PageDown`    | Halaman atas/bawah           |
| `Space`                  | Pilih baris (selection mode) |
| `Shift+Space`            | Pilih baris (range)          |
| `Enter`                  | Mulai edit / commit          |
| `F2`                     | Mulai edit                   |
| `Esc`                    | Batal edit / tutup overlay   |
| `Ctrl+A`                 | Pilih semua (jika diizinkan) |
| `Ctrl+C`                 | Copy sel terpilih            |
| `Alt+ArrowDown`          | Buka header filter           |

Peta lengkap ada di [DataGrid API §8](components/datagrid/03-api.md#8-keyboard-map).

### 2.4 Live region

- Satu `aria-live="polite"` per instance, `aria-atomic="true"`.
- Pesan: "Diurutkan berdasarkan Customer, ascending", "12 baris dipilih",
  "Halaman 2 dari 10".
- Throttle 500 ms; jangan mengumumkan setiap perubahan scroll.
- Tidak mengumumkan data sensitif.

### 2.5 Testing a11y

- axe otomatis di setiap state.
- Keyboard-only E2E.
- Screen reader manual: NVDA + Chrome/Firefox (Windows), VoiceOver + Safari
  (macOS/iOS).
- Zoom 200%, reflow 320px, high contrast, reduced motion.
- **DILARANG** merilis komponen baru tanpa manual a11y pass.

---

## 3. Internasionalisasi (i18n)

### 3.1 Prinsip

- Tidak ada string UI hardcoded di komponen.
- Format angka/tanggal memakai `Intl`, bukan implementasi sendiri.
- Locale dan timezone eksplisit; tidak bergantung pada setting mesin.
- RTL didukung oleh layout, bukan teks terbalik.

### 3.2 API

```ts
interface LocaleOptions {
  locale?: string; // default: 'en'
  fallbackLocale?: string; // default: 'en'
  messages?: Record<string, string>; // override per key
  timeZone?: string; // default: undefined (pakai locale)
  currency?: string; // default: 'USD'
}
```

- `locale` memakai BCP 47 (`id-ID`, `en-US`, `ar-EG`).
- Fallback chain: `locale` → `fallbackLocale` → `en`.
- `messages` hanya menambah/menimpa key, tidak menghapus default.
- **DILARANG** mengevaluasi string pesan sebagai kode.

### 3.3 Message key

Format: `sui.<komponen>.<area>.<key>`

Contoh:

```text
sui.datagrid.filter.contains
sui.datagrid.filter.startsWith
sui.datagrid.selection.selectAll
sui.datagrid.pager.pageOf
sui.pivotgrid.total.grand
sui.chart.legend.showSeries
sui.common.validation.required
```

- Placeholder memakai `{nama}` dan di-escape, bukan HTML.
- Plural memakai `Intl.PluralRules`; pesan dapat berupa objek
  `{ one, other }`.
- Tanggal/number memakai `Intl.NumberFormat`/`DateTimeFormat`.
- Timezone default mengikuti locale; consumer dapat menetapkan eksplisit.

### 3.4 RTL

- Deteksi `dir="rtl"` pada container atau `locale` RTL.
- Mirror layout, bukan teks.
- Ikon arah dimirror; ikon semantik (mis. play) tidak.
- Angka tetap LTR di dalam teks RTL.
- Test visual RTL untuk semua komponen.

### 3.5 Pseudo-locale

- `en-XA` (pseudo) untuk test: teks diperpanjang 30%, karakter aksen.
- Digunakan di visual regression untuk mendeteksi truncation.
- Tidak dikirim ke production.

### 3.6 Format

| Tipe     | Default                                        | Opsi                                                |
| -------- | ---------------------------------------------- | --------------------------------------------------- |
| Number   | `Intl.NumberFormat(locale)`                    | `format: { type:'number', precision, useGrouping }` |
| Currency | `Intl.NumberFormat(locale,{style:'currency'})` | `currency` wajib                                    |
| Date     | `Intl.DateTimeFormat(locale)`                  | `dateStyle`, `timeStyle`, `timeZone`                |
| Percent  | `style:'percent'`                              | `precision`                                         |
| Custom   | fungsi murni                                   | `(value, context) => string`                        |

Aturan:

- Format **DILARANG** menghasilkan HTML.
- `NaN`/`Infinity`/`null` ditampilkan dengan placeholder yang dapat
  dikonfigurasi.
- Format tidak boleh bergantung pada locale mesin.

---

## 4. Token dan tema untuk DataGrid

Token khusus grid (contoh):

```css
.sui-grid {
  --sui-grid-row-height: var(--sui-density-row-height, 40px);
  --sui-grid-header-height: 40px;
  --sui-grid-cell-padding-x: 12px;
  --sui-grid-border-color: var(--sui-color-border-subtle);
  --sui-grid-header-bg: var(--sui-color-bg-subtle);
  --sui-grid-row-hover-bg: var(--sui-color-bg-hover);
  --sui-grid-row-selected-bg: var(--sui-color-accent-subtle);
  --sui-grid-cell-focus-ring: var(--sui-focus-ring-color);
}
```

- Consumer dapat override per instance dengan style pada container.
- Dark mode otomatis karena token.
- Density mengubah row height dan padding, bukan struktur DOM.

---

## 5. Checklist tema & a11y sebelum rilis komponen

- [ ] Semua warna dari token; tidak ada hardcoded.
- [ ] Light, dark, high-contrast diuji.
- [ ] Density comfortable/compact diuji.
- [ ] RTL diuji.
- [ ] Keyboard-only path lengkap.
- [ ] Fokus terlihat dan dipulihkan.
- [ ] ARIA role/state benar.
- [ ] Live region tidak spam.
- [ ] Kontras lolos axe.
- [ ] Reduced motion dihormati.
- [ ] Zoom 200% dan reflow 320px.
- [ ] Semua string via i18n.
- [ ] Format angka/tanggal via Intl.
- [ ] Manual screen reader pass.

---

_Untuk peta keyboard dan event DataGrid, lihat
[DataGrid API](components/datagrid/03-api.md)._
