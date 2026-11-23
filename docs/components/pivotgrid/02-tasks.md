# PivotGrid — Task List & Tracking

> **Status:** Draft v1.0 · **Owner:** Pivot squad
> **Sumber kebenaran status:** file ini.
> **Estimasi:** ideal day. Legenda: `TODO` · `WIP` · `DONE` · `BLOCKED` · `CUT`.

---

## Ringkasan

| Fase | Task | Estimasi (ideal day) |
|---|---:|---:|
| PV-0 Kontrak | 3 | 9 |
| PV-1 Model & cube | 6 | 38 |
| PV-2 Rendering | 5 | 27 |
| PV-3 Fitur | 6 | 25 |
| PV-4 Adapter & test | 5 | 37 |
| PV-5 Hardening & GA | 4 | 21 |
| **Total** | **29** | **157** |

---

## PV-0 — Kontrak (2 minggu)

| ID | Fase | Task | Area | Pri | Est (d) | Depends | Status | Owner | PR |
|---|---|---|---|---|---:|---|---|---|---|
| PV-001 | PV-0 | Finalisasi scope, non-goals, acceptance criteria | Docs | P0 | 3 | — | TODO | — | — |
| PV-002 | PV-0 | Public API + tipe `PivotField`, `PivotStore`, event | API | P0 | 4 | PV-001 | TODO | — | — |
| PV-003 | PV-0 | Threat model + payload corpus (cube, drill-down, export) | Security | P0 | 2 | PV-001 | TODO | — | — |

**Gate G-PV0:** API & threat model disetujui; field model final.

---

## PV-1 — Model & cube (5 minggu)

| ID | Fase | Task | Area | Pri | Est (d) | Depends | Status | Owner | PR |
|---|---|---|---|---|---:|---|---|---|---|
| PV-004 | PV-1 | Field model: area, sorting, filter, validation, limit | Model | P0 | 5 | PV-002 | TODO | — | — |
| PV-005 | PV-1 | Cube builder sparse + grand total + subtotal | Data | P0 | 8 | PV-004 | TODO | — | — |
| PV-006 | PV-1 | Aggregation engine: sum/count/min/max/avg | Data | P0 | 6 | PV-005 | TODO | — | — |
| PV-007 | PV-1 | Member sorting/filtering + blanks + collator | Data | P0 | 5 | PV-004, PV-006 | TODO | — | — |
| PV-008 | PV-1 | Layout engine: row/column tree, span, totals | Model | P0 | 8 | PV-005 | TODO | — | — |
| PV-009 | PV-1 | Paging/virtual math untuk baris & kolom | Data | P0 | 6 | PV-008 | TODO | — | — |

**Gate G-PV1:** cube 100k baris; agregasi benar; layout tree unit-tested;
coverage data/model ≥ 90%.

---

## PV-2 — Rendering (5 minggu)

| ID | Fase | Task | Area | Pri | Est (d) | Depends | Status | Owner | PR |
|---|---|---|---|---|---:|---|---|---|---|
| PV-010 | PV-2 | Renderer grid: corner, row header, column header, cell | View | P0 | 8 | PV-008 | TODO | — | — |
| PV-011 | PV-2 | Expand/collapse + `aria-expanded` + persist | Interaction | P0 | 4 | PV-010 | TODO | — | — |
| PV-012 | PV-2 | Subtotals & grand total rendering | View | P0 | 5 | PV-010, PV-006 | TODO | — | — |
| PV-013 | PV-2 | Field chooser dialog + drag/keyboard | Interaction | P0 | 5 | PV-004, PV-010 | TODO | — | — |
| PV-014 | PV-2 | Drill-down dialog + query baris sumber | Interaction | P1 | 5 | PV-010, PV-005 | TODO | — | — |

**Gate G-PV2:** render 100k sel; expand < 100 ms; keyboard dasar; 0 axe
critical.

---

## PV-3 — Fitur (4 minggu)

| ID | Fase | Task | Area | Pri | Est (d) | Depends | Status | Owner | PR |
|---|---|---|---|---|---:|---|---|---|---|
| PV-015 | PV-3 | Formatting sel + format angka/tanggal + conditional | View | P0 | 4 | PV-010 | TODO | — | — |
| PV-016 | PV-3 | State persistence (fields, sort, filter, expand) | Model | P1 | 3 | PV-004, PV-011 | TODO | — | — |
| PV-017 | PV-3 | Remote pivot protocol + fallback lokal | Data | P1 | 7 | PV-005 | TODO | — | — |
| PV-018 | PV-3 | Custom aggregation + isolasi error | Data | P1 | 4 | PV-006 | TODO | — | — |
| PV-019 | PV-3 | CSV export + formula guard + hidden fields | Export | P0 | 3 | PV-010 | TODO | — | — |
| PV-020 | PV-3 | Excel export OOXML minimal | Export | P1 | 4 | PV-019 | TODO | — | — |

**Gate G-PV3:** semua fitur P0/P1 selesai; export valid; state versioned;
remote fallback aman.

---

## PV-4 — Adapter & test (4 minggu)

| ID | Fase | Task | Area | Pri | Est (d) | Depends | Status | Owner | PR |
|---|---|---|---|---|---:|---|---|---|---|
| PV-021 | PV-4 | Keyboard navigation + ARIA grid/tree + live region | A11y | P0 | 7 | PV-010, PV-011 | TODO | — | — |
| PV-022 | PV-4 | Adapter React + Vue + template bridge | Adapter | P0 | 8 | PV-010, PV-013 | TODO | — | — |
| PV-023 | PV-4 | Adapter Angular + vanilla + jQuery bridge | Adapter | P0 | 8 | PV-010, PV-013 | TODO | — | — |
| PV-024 | PV-4 | Parity suite 40 skenario × 4 adapter | Test | P0 | 4 | PV-022, PV-023 | TODO | — | — |
| PV-025 | PV-4 | Unit/browser test + security corpus | Test | P0 | 10 | PV-006, PV-010, PV-017 | TODO | — | — |

**Gate G-PV4 (beta):** 4 adapter parity; a11y manual; security corpus lulus;
memory stabil.

---

## PV-5 — Hardening & GA (2 minggu)

| ID | Fase | Task | Area | Pri | Est (d) | Depends | Status | Owner | PR |
|---|---|---|---|---|---:|---|---|---|---|
| PV-026 | PV-5 | Performance tuning 1.000.000 sel + worker | Perf | P0 | 6 | PV-009, PV-010 | TODO | — | — |
| PV-027 | PV-5 | Security hardening + CSP + fuzz | Security | P0 | 4 | PV-014, PV-017, PV-019, PV-020 | TODO | — | — |
| PV-028 | PV-5 | Docs + 15 demo + API reference | Docs | P0 | 6 | PV-025 | TODO | — | — |
| PV-029 | PV-5 | Release candidate + smoke test + GA | Release | P0 | 5 | PV-026, PV-027, PV-028 | TODO | — | — |

**Gate G-PV5 (GA):** performance & security sign-off; docs lengkap; rilis 1.0.

---

## Aturan update

Sama dengan [DataGrid tasks §Aturan update](../datagrid/07-tasks.md#aturan-update).
Jalankan `node docs/10-tracking/tools/progress.mjs --write` setelah perubahan.
