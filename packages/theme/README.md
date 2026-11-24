# @simpleui/theme

Design token, tema, dan utilitas CSS untuk SimpleUI. Tanpa runtime JavaScript
(CSS layers + custom properties).

## Pemakaian

```html
<link rel="stylesheet" href="node_modules/@simpleui/theme/dist/index.css" />

<div class="sui-theme" data-theme="dark" data-density="compact">
  <!-- komponen SimpleUI -->
</div>
```

Atau lewat bundler:

```ts
import '@simpleui/theme/styles.css';
```

- Tema: `data-theme="light" | "dark" | "high-contrast"`.
  Bila atribut tidak diset, tema mengikuti `prefers-color-scheme`.
- Density: `data-density="comfortable" | "compact" | "spacious"`
  (default `comfortable`).
- Atribut boleh dipasang pada `.sui-theme` atau pada `<html>`.

## Urutan layer

```css
@layer simpleui.reset, simpleui.tokens, simpleui.base, simpleui.component,
  simpleui.utilities;
```

Karena memakai layer, consumer dapat meng-override tanpa `!important`:

```css
@layer simpleui.tokens {
  .sui-theme {
    --sui-color-accent-default: #7c3aed;
  }
}
```

## Kategori token

| Kategori  | Contoh token                                                                       |
| --------- | ---------------------------------------------------------------------------------- |
| `color`   | `--sui-color-bg-surface`, `--sui-color-text-primary`, `--sui-color-accent-default` |
| `space`   | `--sui-space-1` … `--sui-space-12` (skala 4px)                                     |
| `font`    | `--sui-font-family-base`, `--sui-font-size-md`, `--sui-font-weight-medium`         |
| `line`    | `--sui-line-height-tight`, `--sui-line-height-normal`                              |
| `radius`  | `--sui-radius-sm`, `--sui-radius-md`, `--sui-radius-full`                          |
| `shadow`  | `--sui-shadow-sm`, `--sui-shadow-md`, `--sui-shadow-overlay`                       |
| `border`  | `--sui-border-width`, `--sui-border-color`                                         |
| `focus`   | `--sui-focus-ring-color`, `--sui-focus-ring-width`, `--sui-focus-ring-offset`      |
| `z`       | `--sui-z-dropdown`, `--sui-z-modal`, `--sui-z-toast`                               |
| `motion`  | `--sui-motion-duration-fast`, `--sui-motion-ease-standard`                         |
| `density` | `--sui-density-row-height`, `--sui-density-cell-padding`                           |

Nama mengikuti pola `--sui-<kategori>-<nama>[-<varian>]`. Nilai lengkap ada di
[`src/tokens.css`](src/tokens.css).

## Aksesibilitas

- Kontras teks default dan tema gelap memenuhi WCAG AA (≥ 4.5:1); tema
  `high-contrast` memenuhi AAA (≥ 7:1). Nilai ini dijaga otomatis oleh
  `src/tokens.test.ts`.
- `@media (forced-colors: active)` memakai warna sistem.
- `@media (prefers-reduced-motion: reduce)` mematikan durasi motion.
- Fokus keyboard memakai `:focus-visible` dengan cincin dari token.
- Properti layout memakai properti logis (`inline-size`, `margin-inline-start`)
  sehingga RTL bekerja tanpa CSS tambahan.

## Build

```bash
pnpm --filter @simpleui/theme build   # Lightning CSS: bundel, minify, source map
pnpm --filter @simpleui/theme test    # kontrak token + kontras WCAG
```

Output di `dist/`: `index.css` (semua layer), `tokens.css` (token saja), dan
masing-masing `.map`.

## Aturan kontribusi

- **Dilarang** nilai warna/spacing hardcoded di CSS komponen; selalu token.
- **Dilarang** `!important`, kecuali `.sui-visually-hidden` (aksesibilitas).
- Selector maksimal 3 level dan tidak boleh menyentuh elemen di luar `.sui-*`.
- Token baru wajib ditambahkan ke tema default dan diuji di `tokens.test.ts`.
