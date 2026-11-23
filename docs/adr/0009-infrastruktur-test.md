# ADR-0009 — Infrastruktur Test

> **Status:** Accepted · **Tanggal:** 2026-11-23 · **Owner:** QA Lead
> **Reviewer:** Tech Lead, Core Engineer
> **Menggantikan:** — · **Berlaku sampai:** ditinjau saat 2.0

---

## 1. Konteks

SimpleUI membutuhkan test yang:

- cepat untuk feedback PR;
- nyata untuk layout, scroll, dan keyboard;
- dapat menjalankan suite yang sama di 4 adapter;
- mencakup a11y, security, visual, dan performa;
- tidak flaky.

Pilihan utama: jsdom saja, Vitest browser mode, Playwright component testing,
Cypress.

---

## 2. Keputusan

> Kami memutuskan **Vitest (node + browser mode dengan Playwright provider)**
> sebagai test runner utama, **Playwright** untuk E2E/visual, **axe-core** untuk
> a11y, dan **Stryker** untuk mutation test core.

Detail:

- **Unit murni:** Vitest node.
- **DOM/component:** Vitest browser mode (Chromium) — layout, scroll, pointer,
  keyboard nyata.
- **Contract/parity:** Vitest + harness per framework, dijalankan untuk
  React/Vue/Angular/vanilla.
- **E2E:** Playwright (Chromium, Firefox, WebKit).
- **A11y:** axe-core / `@axe-core/playwright`; manual screen reader checklist.
- **Visual:** Playwright screenshot + `pixelmatch`.
- **Performance:** tinybench + Playwright metrics.
- **Mutation:** Stryker untuk modul core kritis, target ≥ 70%.
- **jsdom** hanya untuk test logika non-layout; bukan untuk komponen visual.
- Semua test memakai seeded fixture, fake timer, locale/timezone eksplisit.

---

## 3. Alternatif yang dipertimbangkan

| Alternatif                   | Kelebihan                 | Kekurangan                        | Alasan tidak dipilih   |
| ---------------------------- | ------------------------- | --------------------------------- | ---------------------- |
| jsdom saja                   | Cepat, murah              | Layout/scroll/pointer tidak nyata | Tidak cukup untuk grid |
| Playwright component testing | Nyata                     | Kurang terintegrasi dengan Vitest | Duplikasi tooling      |
| Cypress                      | DX baik                   | Berat, paralelisasi mahal         | Tidak dipilih          |
| Vitest browser + Playwright  | Satu runner, nyata, cepat | CI membutuhkan browser            | **Dipilih**            |
| Jest                         | Populer                   | ESM/TS config lebih rumit         | Ditolak                |

---

## 4. Konsekuensi

### Positif

- Test komponen memakai browser nyata; bug layout/scroll tertangkap.
- Satu konfigurasi untuk unit dan browser.
- Parity suite dapat dijalankan di lingkungan yang sama.
- Visual dan E2E memakai Playwright yang sama.

### Negatif / risiko

- CI lebih berat daripada jsdom.
- Browser version drift dapat menyebabkan flaky.
- Waktu PR suite perlu dijaga < 15 menit.

### Mitigasi

- Sharding + cache + hanya Chromium di PR; nightly semua browser.
- Pin versi Playwright; update terjadwal.
- Flaky policy: quarantine + issue + owner.
- Benchmark dan visual di nightly.

---

## 5. Keamanan dan privasi

- Security corpus dijalankan di browser nyata, termasuk CSP E2E.
- Tidak ada kredensial di test; fixture sintetis.
- Artefak test (trace/screenshot) tidak memuat data produksi.
- Dependency test diaudit seperti dependency runtime.

---

## 6. Kompatibilitas dan migrasi

- Test bukan public API; dapat berubah kapan saja.
- Jika pindah runner, parity suite dan fixture dipertahankan.
- Node minimum untuk test mengikuti ADR-0006.

---

## 7. Implementasi

| Item       | Detail                       |
| ---------- | ---------------------------- |
| Vitest     | FND-005                      |
| Playwright | FND-006                      |
| Harness    | FND-020                      |
| A11y       | FND-031                      |
| Visual     | FND-032                      |
| Mutation   | Nightly, setelah core stabil |
| Target     | Sebelum DG-2                 |

---

## 8. Referensi

- [Testing Strategy](../04-testing-strategy.md)
- [Rule Umum §7](../00-rule-umum.md#7-aturan-testing)
- [DataGrid test plan](../components/datagrid/05-test-plan.md)

---

## Catatan review

| Tanggal    | Reviewer      | Keputusan | Catatan                     |
| ---------- | ------------- | --------- | --------------------------- |
| 2026-11-23 | QA Lead       | Setuju    | Browser mode untuk komponen |
| 2026-11-23 | Tech Lead     | Setuju    | Satu runner utama           |
| 2026-11-23 | Core Engineer | Setuju    | Mutation untuk core kritis  |
