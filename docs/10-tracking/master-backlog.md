# Master Backlog — Epic Lintas Komponen

> **Status:** Draft v1.0 · **Owner:** Tech Lead / PM
> **Tujuan:** pandangan tingkat epic untuk perencanaan kapasitas dan dependency.
> **Detail task:** file `tasks.md` per komponen. Epic di sini **tidak**
> menggandakan task; hanya merangkum.

---

## 1. Ringkasan eksekutif

| Metrik | Nilai |
|---|---:|
| Epic aktif (sudah dipecah) | 4 |
| Task aktif | 174 |
| Estimasi aktif | 831 ideal day (± 41,6 PM) |
| Progress | 1,2% (scaffold + ADR) |
| Milestone terdekat | M1 Foundation (2027-01-29) |
| Komponen pertama | DataGrid |

Angka 831 ideal day **belum** termasuk overhead dokumentasi/QA/security/release
(25–35%) dan komponen Tier 2–4. Lihat [estimasi](../09-estimasi.md).

---

## 2. Epic yang sudah dipecah

| ID | Epic | Komponen | Task | Est (d) | Milestone | Status | Task list |
|---|---|---|---:|---:|---|---|---|
| E0 | Foundation & platform | FND | 35 | 130 | M1 | Active | [foundation-tasks](foundation-tasks.md) |
| E1 | DataGrid | DG | 77 | 353 | M2–M4 | Planned | [DG tasks](../components/datagrid/07-tasks.md) |
| E2 | PivotGrid | PV | 29 | 157 | M5 | Planned | [PV tasks](../components/pivotgrid/02-tasks.md) |
| E3 | Charts | CH | 33 | 191 | M6 | Planned | [CH tasks](../components/chart/02-tasks.md) |
| | **Total** | | **174** | **831** | | | |

Status epic:

- `Planned` — plan & task list ada, belum mulai.
- `Active` — sudah ada task `WIP` atau `DONE`, gate belum lulus.
- `Blocked` — dependency eksternal belum tersedia.
- `Done` — semua task `DONE` dan gate lulus.

---

## 3. Epic yang belum dipecah (Tier 2–4)

| ID | Epic | Estimasi (PM) | Target | Prasyarat | Catatan |
|---|---|---:|---|---|---|
| E4 | Editors & forms (±30 komponen) | 10 | M7 | Core + DG editing | TextBox, SelectBox, DateBox, Validator, Form, layout |
| E5 | TreeList + Scheduler | 11,5 | M7–M8 | DataGrid, core | TreeList butuh model tree; Scheduler butuh timezone/recurrence |
| E6 | Gantt + VectorMap + Diagram + FileManager | 29 | M8+ | Scheduler, Charts, core | Paling mahal; perlu keahlian khusus |
| E7 | Gauges, range selector, sparkline, bullet, treemap, funnel | 5 | M8 | Charts | Sebagian sudah tercakup Charts |
| E8 | Docs site, contoh, komunitas | 2–3 (ongoing) | Semua | — | Tidak boleh dianggap "gratis" |

Estimasi di atas adalah order-of-magnitude; akan dipecah saat komponen dimulai
dengan [template plan](../11-templates/komponen-plan-template.md).

---

## 4. Dependency graph

```text
E0 Foundation
 │
 ├──► E1 DataGrid ──► E4 Editors & Forms
 │        │
 │        ├──► E5 TreeList
 │        └──► E2 PivotGrid (shared core)
 │
 ├──► E3 Charts ──► E7 visualisasi tambahan
 │        │
 │        └──► E6 Gantt/Map/Diagram
 │
 └──► E5 Scheduler ──► E6 Gantt
```

Aturan:

- E2/E3 boleh mulai setelah **core DataGrid stabil** (DG-2 selesai), bukan
  setelah DG GA.
- E4 membutuhkan editor dasar dari DG-4.
- E6 tidak dimulai sebelum E3 dan E5 stabil.
- Tidak ada dependency melingkar.

---

## 5. Critical path

```text
FND-010/011/012/017/018/019
  → DG-010/011/012/013
  → DG-032/033/034
  → DG-050/051/052/053
  → DG-054/056
  → DG-080/081/083
  → E1 GA
  → E2/E3 GA
```

Bottleneck:

1. Virtualizer + renderer (DG-032/033).
2. Template bridge + adapter (DG-035, DG-050–053).
3. A11y grid pattern (DG-056/057).
4. Security hardening (DG-083).

Mitigasi ada di [DataGrid implementation plan](../components/datagrid/06-implementation-plan.md#10-risiko-dan-mitigasi).

---

## 6. Alokasi kapasitas (baseline)

| Track | FTE | Fokus |
|---|---:|---|
| Core platform | 2 | FND, data layer, security |
| Grid | 2 | DG-1…DG-5 |
| Adapter | 1 | DG-3, lalu PV/CH |
| QA/UX | 1 | test, a11y, visual |
| Design | 0,3 | token, visual spec |
| Security | 0,2 | threat model, review |
| Tech writer | 0,3 | docs, demo |

Total ± 6,8 FTE nominal; effective ± 4 FTE setelah overhead. Lihat
[estimasi §4](../09-estimasi.md#4-skenario-tim-dan-kalender).

---

## 7. Baseline per milestone

| Milestone | Epic | Task `DONE` | Est `DONE` | Gate |
|---|---|---:|---:|---|
| M1 | E0 | 35 | 130 | G1 |
| M2 | E1 (alpha) | ± 41 | ± 169 | G2 |
| M3 | E1 (beta) | ± 67 | ± 297 | G3 |
| M4 | E1 (GA) | 77 | 353 | G4 |
| M5 | E2 | 29 | 157 | G5 |
| M6 | E3 | 33 | 191 | G5 |
| M7 | E4 | — | — | G5 |

Angka `DONE` kumulatif adalah target, bukan hasil. Gunakan dashboard aktual.

---

## 8. Aturan perubahan epic

- Epic baru wajib punya plan + task list + estimasi + dependency.
- Epic tidak boleh dimulai tanpa gate plan (G0).
- Perubahan scope epic > 20% wajib persetujuan stakeholder.
- Epic yang dibatalkan ditandai `Dropped` dan alasannya dicatat.
- Task tidak boleh berpindah epic tanpa update plan.

---

## 9. Cara membaca backlog ini

1. Lihat epic & milestone.
2. Buka task list komponen.
3. Pilih task `TODO` yang dependency-nya `DONE` (lihat dashboard).
4. Ambil task → `WIP` → PR → `DONE`.
5. Generate dashboard.

---

## 10. Riwayat perubahan

| Tanggal | Perubahan | Oleh |
|---|---|---|
| 2026-11-23 | Baseline: 4 epic, 174 task, 831 ideal day | Tech Lead |
| 2026-11-23 | 11 ADR Accepted; FND-024 selesai (2 ideal day) | Tech Lead |
| 2026-11-23 | Scaffold monorepo FND-001/002/003 selesai (8 ideal day) | Tech Lead |

---

*Dashboard: [progress.md](progress.md) · Aturan: [README](README.md)*
