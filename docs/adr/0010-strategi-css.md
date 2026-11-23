# ADR-0010 — Strategi CSS: Layer dan Custom Properties

> **Status:** Accepted · **Tanggal:** 2026-11-23 · **Owner:** Design System Lead
> **Reviewer:** Tech Lead, Security Reviewer
> **Menggantikan:** — · **Berlaku sampai:** ditinjau saat 2.0

---

## 1. Konteks

Library harus:

- mudah di-themed tanpa rebuild;
- aman terhadap CSP (tanpa inline style/script);
- mendukung light/dark/high-contrast, density, RTL;
- tidak menambah runtime CSS-in-JS;
- dapat di-tree-shake dan di-override consumer.

---

## 2. Keputusan

> Kami memutuskan **CSS layer + CSS custom properties**, tanpa CSS-in-JS runtime.

Detail:

- Layer: `simpleui.reset`, `simpleui.tokens`, `simpleui.base`,
  `simpleui.component`, `simpleui.utilities`.
- Token: `--sui-<kategori>-<nama>-<varian>`.
- Tema via `data-theme="light|dark|high-contrast"` dan `data-density`.
- RTL memakai properti logis (`margin-inline-start`, `inset-inline-start`).
- Build memakai **Lightning CSS**; output satu file per paket + file tema.
- **DILARANG** CSS-in-JS runtime, `<style>` injection dari data, dan inline
  `style` string dari data.
- Style dinamis (lebar kolom, tinggi baris) memakai CSSOM
  `element.style.setProperty()` dengan nilai tervalidasi.
- Prefix class `sui-`; tidak ada selector global di luar scope.
- `@layer` memungkinkan consumer meng-override tanpa `!important`.

---

## 3. Alternatif yang dipertimbangkan

| Alternatif                    | Kelebihan                           | Kekurangan                                      | Alasan tidak dipilih |
| ----------------------------- | ----------------------------------- | ----------------------------------------------- | -------------------- |
| CSS-in-JS runtime             | Colokasi, theme dinamis             | CSP, runtime cost, bundle                       | Ditolak              |
| Tailwind                      | Cepat                               | Utility class bocor ke consumer, semantic sulit | Ditolak              |
| SCSS modules                  | Familiar                            | Build tambahan, token tidak runtime             | Tidak perlu          |
| CSS layer + custom properties | CSP-friendly, murah, mudah override | Perlu disiplin token                            | **Dipilih**          |
| Shadow DOM                    | Isolasi                             | Theming & a11y lebih rumit                      | Ditunda              |

---

## 4. Konsekuensi

### Positif

- Theme dapat diubah tanpa rebuild dan tanpa runtime JS.
- CSP-friendly; tidak ada style injection.
- Ukuran CSS terkendali; token dapat di-override.
- RTL dan density menjadi varian first-class.

### Negatif / risiko

- Consumer harus memahami token untuk kustomisasi mendalam.
- Tidak ada type-safety CSS otomatis (dapat ditambah tooling).
- Perlu disiplin mencegah hardcoded value.

### Mitigasi

- Dokumentasi token + contoh override.
- Lint/stylelint untuk melarang warna hardcoded.
- Visual test per tema/density/RTL.

---

## 5. Keamanan dan privasi

- Tidak ada `<style>` yang di-inject dari data.
- Nilai style dinamis divalidasi (angka/unit/warna); `url()` dari data dilarang.
- `@layer` mengurangi risiko selector global yang tidak disengaja.
- Tidak ada font/asset dari CDN pihak ketiga secara default.
- CSP `style-src 'self'` tetap berlaku.

---

## 6. Kompatibilitas dan migrasi

- Nama token stabil; perubahan nama = breaking.
- Consumer dapat override token di `:root` atau container.
- Tidak ada dependency CSS framework.
- Migrasi dari CSS-in-JS lain: gunakan token dan class, bukan inline style.

---

## 7. Implementasi

| Item   | Detail                      |
| ------ | --------------------------- |
| Token  | FND-010                     |
| Build  | Lightning CSS               |
| Tema   | `@simpleui/theme`           |
| Test   | visual per tema/RTL/density |
| Target | Sebelum DG-2                |

---

## 8. Referensi

- [Theming/a11y/i18n](../06-theming-a11y-i18n.md)
- [Security §6](../05-security.md#6-csp-dan-keamanan-browser)
- [Build & Release §3](../07-build-release.md#3-output-build)

---

## Catatan review

| Tanggal    | Reviewer           | Keputusan | Catatan                       |
| ---------- | ------------------ | --------- | ----------------------------- |
| 2026-11-23 | Design System Lead | Setuju    | Token-first                   |
| 2026-11-23 | Security Reviewer  | Setuju    | Tanpa runtime style injection |
| 2026-11-23 | Tech Lead          | Setuju    | CSS layer                     |
