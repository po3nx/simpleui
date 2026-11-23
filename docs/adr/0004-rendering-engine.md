# ADR-0004 — Rendering Engine: DOM Bersama + Adapter Tipis

> **Status:** Accepted · **Tanggal:** 2026-11-23 · **Owner:** Tech Lead
> **Reviewer:** Core Engineer, Adapter Engineer
> **Menggantikan:** — · **Berlaku sampai:** ditinjau pada DataGrid GA atau jika
> ada kebutuhan Web Components

---

## 1. Konteks

SimpleUI harus berperilaku identik di JavaScript, TypeScript, React, Vue, dan
Angular. Ada empat pendekatan utama:

1. headless core + renderer per framework;
2. Web Components sebagai satu-satunya output;
3. DOM engine bersama + adapter tipis;
4. fork library lain.

Keputusan ini menentukan biaya QA, konsistensi a11y, dan maintainability
jangka panjang.

---

## 2. Keputusan

> Kami memutuskan **DOM engine bersama + adapter tipis** dengan **template
> bridge** dan **parity test suite**.

Detail:

- `@simpleui/core` menyediakan kernel, state, DOM utils, fokus, keyboard,
  i18n, dan data layer.
- Komponen (`datagrid`, `pivotgrid`, `charts`) merender DOM sendiri.
- Adapter framework hanya:
  - memetakan props → options;
  - meneruskan event;
  - menjembatani template (React node, Vue slot, Angular `TemplateRef`);
  - mengelola lifecycle.
- **Tidak ada VDOM umum** di core. Grid memakai row recycling dan update
  targeted.
- **Tidak ada implementasi grid kedua** di adapter mana pun.
- Web Components dapat ditambahkan sebagai output tambahan di masa depan,
  tetapi bukan jalur utama 1.0.

---

## 3. Alternatif yang dipertimbangkan

| Alternatif                             | Kelebihan                   | Kekurangan                                        | Alasan tidak dipilih    |
| -------------------------------------- | --------------------------- | ------------------------------------------------- | ----------------------- |
| Headless core + renderer per framework | Integrasi paling native     | Perilaku/a11y diduplikasi 4×; bug tidak konsisten | Biaya QA terlalu tinggi |
| Web Components saja                    | Standar, framework-agnostic | Styling/SSR/forms/Angular integration rumit       | Ditunda                 |
| DOM bersama + adapter tipis            | Satu perilaku, konsisten    | Template bridge kompleks                          | **Dipilih**             |
| Lit sebagai engine internal            | Templating ringan           | Menambah dependency & model mental                | Tidak perlu untuk grid  |
| Fork library lain                      | Cepat awalnya               | Lisensi, kontrol, technical debt                  | Ditolak                 |

---

## 4. Konsekuensi

### Positif

- Satu implementasi sorting/filtering/selection/a11y untuk semua framework.
- Bug diperbaiki sekali.
- Parity test suite dapat membuktikan konsistensi.
- Core dapat diuji tanpa framework.

### Negatif / risiko

- Template bridge perlu desain hati-hati (React root, Vue app, Angular view).
- Adapter harus disiplin tidak menambah logika.
- Tidak ada SSR hydration markup internal pada 1.0.

### Mitigasi

- Spike DG-005 sebelum implementasi.
- Kontrak adapter kecil dan diuji.
- Parity suite 40 skenario.
- Review arsitektur pada setiap PR adapter.

---

## 5. Keamanan dan privasi

- Renderer memakai `textContent`; HTML hanya lewat sanitizer opt-in.
- Template framework dianggap kode tepercaya; string dari data disanitasi.
- Tidak ada `innerHTML` dengan data.
- Tidak ada `eval`/`new Function` untuk template atau ekspresi.
- Adapter tidak boleh menyuntikkan style/script dari data.

---

## 6. Kompatibilitas dan migrasi

- API core stabil; adapter mengikuti versi yang sama (fixed group).
- Perubahan rendering internal tidak boleh mengubah public API.
- Jika di masa depan Web Components ditambahkan, ia harus memakai core yang
  sama, bukan implementasi baru.

---

## 7. Implementasi

| Item            | Detail                          |
| --------------- | ------------------------------- |
| Core kernel     | FND-011, FND-012, FND-013       |
| Template bridge | FND-017, DG-005                 |
| Renderer grid   | DG-030…DG-035                   |
| Adapter         | DG-050…DG-053                   |
| Parity          | DG-054                          |
| Target          | Diputuskan sebelum DG-1 dimulai |

---

## 8. Referensi

- [Arsitektur §3](../01-arsitektur.md#3-gaya-arsitektur)
- [Adapter](../02-adapter-cross-framework.md)
- [DataGrid arsitektur](../components/datagrid/02-arsitektur.md)

---

## Catatan review

| Tanggal    | Reviewer         | Keputusan | Catatan                           |
| ---------- | ---------------- | --------- | --------------------------------- |
| 2026-11-23 | Tech Lead        | Setuju    | Opsi C dipilih                    |
| 2026-11-23 | Core Engineer    | Setuju    | Row recycling, bukan VDOM         |
| 2026-11-23 | Adapter Engineer | Setuju    | Template bridge jadi risiko utama |
