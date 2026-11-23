# Charts — Task List & Tracking

> **Status:** Draft v1.0 · **Owner:** Chart squad
> **Sumber kebenaran status:** file ini.
> **Estimasi:** ideal day. Legenda: `TODO` · `WIP` · `DONE` · `BLOCKED` · `CUT`.

---

## Ringkasan

| Fase                     |   Task | Estimasi (ideal day) |
| ------------------------ | -----: | -------------------: |
| CH-0 Kontrak             |      3 |                    9 |
| CH-1 Core rendering      |      7 |                   45 |
| CH-2 Series              |      8 |                   45 |
| CH-3 Interaksi & adapter |      8 |                   45 |
| CH-4 Test, perf, GA      |      7 |                   47 |
| **Total**                | **33** |              **191** |

---

## CH-0 — Kontrak (2 minggu)

| ID     | Fase | Task                                                     | Area     | Pri | Est (d) | Depends | Status | Owner | PR  |
| ------ | ---- | -------------------------------------------------------- | -------- | --- | ------: | ------- | ------ | ----- | --- |
| CH-001 | CH-0 | Finalisasi scope, taksonomi chart, acceptance criteria   | Docs     | P0  |       3 | —       | TODO   | —     | —   |
| CH-002 | CH-0 | Public API + tipe `SeriesOptions`, `AxisOptions`, event  | API      | P0  |       4 | CH-001  | TODO   | —     | —   |
| CH-003 | CH-0 | Threat model + payload corpus (label/tooltip/annotation) | Security | P0  |       2 | CH-001  | TODO   | —     | —   |

**Gate G-CH0:** API disetujui; daftar seri P0/P1 final; threat model disetujui.

---

## CH-1 — Core rendering (7 minggu)

| ID     | Fase | Task                                              | Area        | Pri | Est (d) | Depends        | Status | Owner | PR  |
| ------ | ---- | ------------------------------------------------- | ----------- | --- | ------: | -------------- | ------ | ----- | --- |
| CH-004 | CH-1 | Scene graph (node, transform, update incremental) | Core        | P0  |       8 | CH-002         | TODO   | —     | —   |
| CH-005 | CH-1 | SVG renderer + elemen + attribute mapping         | Render      | P0  |       6 | CH-004         | TODO   | —     | —   |
| CH-006 | CH-1 | Canvas renderer + devicePixelRatio + hit testing  | Render      | P1  |       7 | CH-004         | TODO   | —     | —   |
| CH-007 | CH-1 | Scales: linear, log, time, band, point + ticks    | Core        | P0  |       6 | CH-002         | TODO   | —     | —   |
| CH-008 | CH-1 | Axes: tick, label, grid, min/max, multiple axis   | Render      | P0  |       7 | CH-007, CH-005 | TODO   | —     | —   |
| CH-009 | CH-1 | Layout engine: plot area, legend, title, margin   | Core        | P0  |       5 | CH-008         | TODO   | —     | —   |
| CH-010 | CH-1 | Tooltip, crosshair, hit testing, posisi           | Interaction | P0  |       6 | CH-009         | TODO   | —     | —   |

**Gate G-CH1:** line chart dasar berjalan di SVG; scale/axis/layout unit-tested;
tooltip aman; 0 axe critical.

---

## CH-2 — Series (7 minggu)

| ID     | Fase | Task                                           | Area   | Pri | Est (d) | Depends        | Status | Owner | PR  |
| ------ | ---- | ---------------------------------------------- | ------ | --- | ------: | -------------- | ------ | ----- | --- |
| CH-011 | CH-2 | Line + area series + null gap + stack opsional | Series | P0  |       8 | CH-010         | TODO   | —     | —   |
| CH-012 | CH-2 | Bar + stacked + grouped bar                    | Series | P0  |       8 | CH-010         | TODO   | —     | —   |
| CH-013 | CH-2 | Scatter + bubble + size scale                  | Series | P1  |       5 | CH-010         | TODO   | —     | —   |
| CH-014 | CH-2 | Financial: candlestick + OHLC                  | Series | P1  |       6 | CH-012         | TODO   | —     | —   |
| CH-015 | CH-2 | Pie + donut + label + legend                   | Series | P1  |       4 | CH-010         | TODO   | —     | —   |
| CH-016 | CH-2 | Polar/radar + radial axis                      | Series | P1  |       5 | CH-008         | TODO   | —     | —   |
| CH-017 | CH-2 | Sparkline + bullet                             | Series | P1  |       4 | CH-011         | TODO   | —     | —   |
| CH-018 | CH-2 | Range selector + sinkronisasi zoom             | Series | P1  |       5 | CH-010, CH-011 | TODO   | —     | —   |

**Gate G-CH2:** semua seri P0/P1 render benar; visual test dasar; performa
10k titik.

---

## CH-3 — Interaksi & adapter (7 minggu)

| ID     | Fase | Task                                            | Area        | Pri | Est (d) | Depends        | Status | Owner | PR  |
| ------ | ---- | ----------------------------------------------- | ----------- | --- | ------: | -------------- | ------ | ----- | --- |
| CH-019 | CH-3 | Zoom/pan (mouse + keyboard + reset)             | Interaction | P0  |       6 | CH-010         | TODO   | —     | —   |
| CH-020 | CH-3 | Animation + reduced motion + interrupt          | Interaction | P1  |       4 | CH-011         | TODO   | —     | —   |
| CH-021 | CH-3 | Annotations: line/point/band + teks aman        | Render      | P1  |       5 | CH-009         | TODO   | —     | —   |
| CH-022 | CH-3 | Export PNG/SVG + background + ukuran            | Export      | P1  |       5 | CH-005, CH-006 | TODO   | —     | —   |
| CH-023 | CH-3 | Responsive + resize debounce + label overlap    | Layout      | P0  |       3 | CH-009         | TODO   | —     | —   |
| CH-024 | CH-3 | A11y: figure, data table, keyboard, live region | A11y        | P0  |       6 | CH-010         | TODO   | —     | —   |
| CH-025 | CH-3 | Adapter React/Vue/Angular/vanilla + template    | Adapter     | P0  |      12 | CH-002, CH-011 | TODO   | —     | —   |
| CH-026 | CH-3 | Parity suite 30 skenario × 4 adapter            | Test        | P0  |       4 | CH-025         | TODO   | —     | —   |

**Gate G-CH3 (beta):** 4 adapter parity; a11y manual; zoom/pan 60 fps; export
valid.

---

## CH-4 — Test, perf, GA (9 minggu)

| ID     | Fase | Task                                          | Area     | Pri | Est (d) | Depends                                | Status | Owner | PR  |
| ------ | ---- | --------------------------------------------- | -------- | --- | ------: | -------------------------------------- | ------ | ----- | --- |
| CH-027 | CH-4 | Unit test scale/serie/layout ≥ 90%            | Test     | P0  |       8 | CH-007, CH-008, CH-011, CH-012, CH-013 | TODO   | —     | —   |
| CH-028 | CH-4 | Visual regression 20 skenario × 2 tema × RTL  | Test     | P0  |       8 | CH-011, CH-012, CH-014, CH-015, CH-016 | TODO   | —     | —   |
| CH-029 | CH-4 | Performance 100k Canvas + decimation + memory | Perf     | P0  |       8 | CH-006, CH-011                         | TODO   | —     | —   |
| CH-030 | CH-4 | Security hardening + CSP + fuzz               | Security | P0  |       3 | CH-010, CH-021, CH-022                 | TODO   | —     | —   |
| CH-031 | CH-4 | Docs + 25 demo + API reference                | Docs     | P0  |      10 | CH-027                                 | TODO   | —     | —   |
| CH-032 | CH-4 | Theme/density/RTL + locale                    | UI       | P1  |       4 | CH-009                                 | TODO   | —     | —   |
| CH-033 | CH-4 | Release candidate + smoke test + GA           | Release  | P0  |       6 | CH-028, CH-029, CH-030, CH-031         | TODO   | —     | —   |

**Gate G-CH4 (GA):** performance & security sign-off; visual stabil; docs
lengkap; rilis 1.0.

---

## Aturan update

Sama dengan [DataGrid tasks §Aturan update](../datagrid/07-tasks.md#aturan-update).
Jalankan `node docs/10-tracking/tools/progress.mjs --write` setelah perubahan.
