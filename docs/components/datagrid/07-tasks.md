# DataGrid 07 — Task List & Tracking

> **Status:** Draft v1.0 · **Owner:** Grid squad
> **Sumber kebenaran status:** file ini. Dashboard di
> [progress](../../10-tracking/progress.md) di-generate dari sini.
> **Cara update:** lihat [Tracking §3](../../10-tracking/README.md#3-cara-update-status).
> **Estimasi:** ideal day (1 hari fokus), bukan hari kalender.

Legenda status: `TODO` · `WIP` · `DONE` · `BLOCKED` · `CUT`.
Dependency `—` berarti tidak ada. Owner diisi nama/initials saat task diambil.

---

## Ringkasan

| Fase                 |   Task | Estimasi (ideal day) |
| -------------------- | -----: | -------------------: |
| DG-0 Kontrak & spike |      7 |                   24 |
| DG-1 Model & data    |     14 |                   60 |
| DG-2 Rendering & MVP |     20 |                   85 |
| DG-3 Adapter & a11y  |      9 |                   55 |
| DG-4 Fitur GA        |     16 |                   73 |
| DG-5 Hardening & GA  |     11 |                   56 |
| **Total**            | **77** |              **353** |

Angka ini adalah baseline perencanaan; perbarui saat task ditambah/dihapus.
Progress berbobot = estimasi `DONE` / estimasi total (di luar `CUT`).

---

## DG-0 — Kontrak & spike (4 minggu)

| ID     | Fase | Task                                                     | Area     | Pri | Est (d) | Depends | Status | Owner | PR  |
| ------ | ---- | -------------------------------------------------------- | -------- | --- | ------: | ------- | ------ | ----- | --- |
| DG-001 | DG-0 | Finalisasi scope, non-goals, dan acceptance criteria     | Docs     | P0  |       2 | —       | TODO   | —     | —   |
| DG-002 | DG-0 | Review & finalisasi public API dan tipe TypeScript       | API      | P0  |       3 | DG-001  | TODO   | —     | —   |
| DG-003 | DG-0 | Visual spec grid + token tema (light/dark/HC, density)   | Design   | P0  |       3 | DG-001  | TODO   | —     | —   |
| DG-004 | DG-0 | Spike virtualizer 100k baris + benchmark                 | Perf     | P0  |       4 | DG-002  | TODO   | —     | —   |
| DG-005 | DG-0 | Spike adapter bridge React/Vue/Angular + template bridge | Adapter  | P0  |       5 | DG-002  | TODO   | —     | —   |
| DG-006 | DG-0 | Threat model + payload corpus DataGrid                   | Security | P0  |       3 | DG-001  | TODO   | —     | —   |
| DG-007 | DG-0 | Test harness + fixture generator (seeded)                | Test     | P0  |       4 | DG-002  | TODO   | —     | —   |

**Gate G-DG0:** virtualizer ≥ 55 fps pada 100k baris; bridge 3 framework
lulus mount/update/unmount; API & threat model disetujui.

---

## DG-1 — Model & data (5 minggu)

| ID     | Fase | Task                                                          | Area  | Pri | Est (d) | Depends        | Status | Owner | PR  |
| ------ | ---- | ------------------------------------------------------------- | ----- | --- | ------: | -------------- | ------ | ----- | --- |
| DG-010 | DG-1 | Options normalizer + validasi runtime                         | Model | P0  |       4 | DG-002         | TODO   | —     | —   |
| DG-011 | DG-1 | Column model: normalisasi, band, visibility, width, id stabil | Model | P0  |       6 | DG-010         | TODO   | —     | —   |
| DG-012 | DG-1 | State store + transaksi + selector + state machine            | Model | P0  |       5 | DG-010         | TODO   | —     | —   |
| DG-013 | DG-1 | DataController + integrasi Store/DataSource                   | Data  | P0  |       6 | DG-011, DG-012 | TODO   | —     | —   |
| DG-014 | DG-1 | Query pipeline: filter + operator aman + batas                | Data  | P0  |       5 | DG-013         | TODO   | —     | —   |
| DG-015 | DG-1 | Query pipeline: sort multi + collator + null order            | Data  | P0  |       3 | DG-013         | TODO   | —     | —   |
| DG-016 | DG-1 | Query pipeline: grouping + group count limit                  | Data  | P1  |       6 | DG-014, DG-015 | TODO   | —     | —   |
| DG-017 | DG-1 | Summary engine: total/group/custom                            | Data  | P1  |       4 | DG-016         | TODO   | —     | —   |
| DG-018 | DG-1 | Paging + matematika virtual scroll                            | Data  | P0  |       4 | DG-013         | TODO   | —     | —   |
| DG-019 | DG-1 | Key identity, validasi unik, composite key                    | Model | P0  |       3 | DG-011         | TODO   | —     | —   |
| DG-020 | DG-1 | Selection model: key-based, mode, range, preserve             | Model | P0  |       5 | DG-012, DG-019 | TODO   | —     | —   |
| DG-021 | DG-1 | Focus model: cell/row, roving tabindex                        | Model | P0  |       3 | DG-012         | TODO   | —     | —   |
| DG-022 | DG-1 | State persistence schema + version + migrasi                  | Model | P1  |       3 | DG-011, DG-012 | TODO   | —     | —   |
| DG-023 | DG-1 | Normalisasi error, retry/cancel semantics                     | Data  | P0  |       3 | DG-013         | TODO   | —     | —   |

**Gate G-DG1:** model memuat 100k baris; sort/filter/group benar; coverage
model/data ≥ 90%; tidak ada akses DOM di model.

---

## DG-2 — Rendering & MVP (5 minggu)

| ID     | Fase | Task                                                  | Area        | Pri | Est (d) | Depends        | Status | Owner | PR  |
| ------ | ---- | ----------------------------------------------------- | ----------- | --- | ------: | -------------- | ------ | ----- | --- |
| DG-030 | DG-2 | Grid DOM skeleton + CSS layout + sticky header/footer | View        | P0  |       5 | DG-003, DG-011 | TODO   | —     | —   |
| DG-031 | DG-2 | Header renderer + sort/filter indicator + aria-sort   | View        | P0  |       4 | DG-030, DG-011 | TODO   | —     | —   |
| DG-032 | DG-2 | Row virtualizer + row recycling + scroll anchoring    | View        | P0  |       8 | DG-030, DG-004 | TODO   | —     | —   |
| DG-033 | DG-2 | Column virtualizer + sticky columns                   | View        | P0  |       5 | DG-032, DG-011 | TODO   | —     | —   |
| DG-034 | DG-2 | Cell renderer + format + null/empty + text-only       | View        | P0  |       5 | DG-032, DG-011 | TODO   | —     | —   |
| DG-035 | DG-2 | Integrasi template bridge (cell/header/row)           | View        | P0  |       4 | DG-030, DG-005 | TODO   | —     | —   |
| DG-036 | DG-2 | Loading/empty/error/no-data state                     | View        | P0  |       2 | DG-030, DG-013 | TODO   | —     | —   |
| DG-037 | DG-2 | Column resize (pointer + keyboard)                    | Interaction | P0  |       5 | DG-034         | TODO   | —     | —   |
| DG-038 | DG-2 | Column reorder (drag + keyboard)                      | Interaction | P0  |       4 | DG-034, DG-011 | TODO   | —     | —   |
| DG-039 | DG-2 | Sorting UX: cycle, multi-sort, reset, aria            | Interaction | P0  |       3 | DG-031         | TODO   | —     | —   |
| DG-040 | DG-2 | Filter row + operator per tipe                        | Interaction | P0  |       4 | DG-031, DG-014 | TODO   | —     | —   |
| DG-041 | DG-2 | Header filter + nilai unik + search + blanks          | Interaction | P0  |       5 | DG-031, DG-014 | TODO   | —     | —   |
| DG-042 | DG-2 | Search panel + debounce + scope kolom                 | Interaction | P0  |       3 | DG-040         | TODO   | —     | —   |
| DG-043 | DG-2 | Pager + page size + total unknown                     | Interaction | P0  |       3 | DG-018, DG-031 | TODO   | —     | —   |
| DG-044 | DG-2 | Checkbox selection + select all semantics             | Interaction | P0  |       4 | DG-020, DG-032 | TODO   | —     | —   |
| DG-045 | DG-2 | Keyboard navigation lengkap + focus visible           | Interaction | P0  |       6 | DG-021, DG-032 | TODO   | —     | —   |
| DG-046 | DG-2 | Column chooser + persist visibility                   | Interaction | P0  |       4 | DG-011, DG-031 | TODO   | —     | —   |
| DG-047 | DG-2 | CSV export + formula guard + filename sanitasi        | Export      | P0  |       4 | DG-013         | TODO   | —     | —   |
| DG-048 | DG-2 | Summary footer UI + format locale                     | View        | P0  |       3 | DG-017, DG-031 | TODO   | —     | —   |
| DG-049 | DG-2 | Context menu + clipboard copy aman                    | Interaction | P1  |       4 | DG-040, DG-044 | TODO   | —     | —   |

**Gate G-DG2 (alpha):** 10k baris 60 fps; keyboard lengkap; 0 axe critical;
0 XSS/CSV lolos; React + vanilla parity dasar.

---

## DG-3 — Adapter & a11y (6 minggu)

| ID     | Fase | Task                                               | Area    | Pri | Est (d) | Depends                        | Status | Owner | PR  |
| ------ | ---- | -------------------------------------------------- | ------- | --- | ------: | ------------------------------ | ------ | ----- | --- |
| DG-050 | DG-3 | Adapter React + StrictMode + controlled props      | Adapter | P0  |       8 | DG-005, DG-035, DG-032         | TODO   | —     | —   |
| DG-051 | DG-3 | Adapter Vue + v-model + slots                      | Adapter | P0  |       8 | DG-005, DG-035, DG-032         | TODO   | —     | —   |
| DG-052 | DG-3 | Adapter Angular + OnPush + NgZone + SSR guard      | Adapter | P0  |      10 | DG-005, DG-035, DG-032         | TODO   | —     | —   |
| DG-053 | DG-3 | Adapter vanilla UMD + jQuery bridge opsional       | Adapter | P0  |       5 | DG-005, DG-035                 | TODO   | —     | —   |
| DG-054 | DG-3 | Parity suite 40 skenario × 4 adapter               | Test    | P0  |       6 | DG-050, DG-051, DG-052, DG-053 | TODO   | —     | —   |
| DG-055 | DG-3 | SSR/import-safety + Angular Universal + Next/Nuxt  | Adapter | P1  |       4 | DG-050, DG-051, DG-052         | TODO   | —     | —   |
| DG-056 | DG-3 | A11y grid pattern: role/aria/live region/focus     | A11y    | P0  |       6 | DG-032, DG-045                 | TODO   | —     | —   |
| DG-057 | DG-3 | Screen reader test NVDA/VoiceOver + perbaikan      | A11y    | P0  |       4 | DG-056                         | TODO   | —     | —   |
| DG-058 | DG-3 | Cross-browser/layout test matrix + visual baseline | Test    | P1  |       4 | DG-032, DG-031                 | TODO   | —     | —   |

**Gate G-DG3 (beta):** 4 adapter parity; 0 axe serious/critical; manual a11y
pass; 100× mount/unmount tanpa leak.

---

## DG-4 — Fitur GA (5 minggu)

| ID     | Fase | Task                                               | Area        | Pri | Est (d) | Depends                | Status | Owner | PR  |
| ------ | ---- | -------------------------------------------------- | ----------- | --- | ------: | ---------------------- | ------ | ----- | --- |
| DG-060 | DG-4 | Editing model + transaksi + optimistic/pessimistic | Model       | P1  |       6 | DG-012, DG-013, DG-020 | TODO   | —     | —   |
| DG-061 | DG-4 | Row/cell edit UI + editor lifecycle                | Interaction | P1  |       6 | DG-060, DG-034         | TODO   | —     | —   |
| DG-062 | DG-4 | Popup/form edit + focus trap + validasi            | Interaction | P1  |       6 | DG-061                 | TODO   | —     | —   |
| DG-063 | DG-4 | Batch edit + dirty tracking + rollback             | Model       | P1  |       6 | DG-060, DG-061         | TODO   | —     | —   |
| DG-064 | DG-4 | Validation engine sync/async + pesan a11y          | Model       | P1  |       5 | DG-063                 | TODO   | —     | —   |
| DG-065 | DG-4 | Lookup column + editor select + remote search      | Interaction | P1  |       4 | DG-064, DG-061         | TODO   | —     | —   |
| DG-066 | DG-4 | Grouping UI + group row + expand/collapse          | Interaction | P1  |       5 | DG-016, DG-031, DG-032 | TODO   | —     | —   |
| DG-067 | DG-4 | Group summary + custom summary                     | View        | P1  |       3 | DG-066, DG-017         | TODO   | —     | —   |
| DG-068 | DG-4 | Master-detail + template + async detail            | View        | P1  |       6 | DG-032, DG-035         | TODO   | —     | —   |
| DG-069 | DG-4 | Fixed columns/bands + shadow + RTL                 | View        | P1  |       5 | DG-033, DG-031         | TODO   | —     | —   |
| DG-070 | DG-4 | Row template + detail template + group template    | View        | P1  |       3 | DG-035, DG-032         | TODO   | —     | —   |
| DG-071 | DG-4 | Excel export OOXML minimal + formula guard         | Export      | P1  |       5 | DG-047, DG-034         | TODO   | —     | —   |
| DG-072 | DG-4 | Print stylesheet + page break                      | View        | P2  |       2 | DG-030                 | TODO   | —     | —   |
| DG-073 | DG-4 | RTL support + logical properties + visual test     | View        | P1  |       4 | DG-030, DG-033         | TODO   | —     | —   |
| DG-074 | DG-4 | Remote grouping/filtering pushdown + fallback      | Data        | P1  |       5 | DG-013, DG-016         | TODO   | —     | —   |
| DG-075 | DG-4 | State persistence UI + storage adapter + migrasi   | Model       | P1  |       2 | DG-022, DG-043         | TODO   | —     | —   |

**Gate G-DG4:** semua fitur P1 selesai; editing/validation edge case; group 100k
dalam budget; Excel valid; RTL lulus; docs 30 demo.

---

## DG-5 — Hardening & GA (5 minggu)

| ID     | Fase | Task                                              | Area     | Pri | Est (d) | Depends                                                                                                                                                        | Status | Owner | PR  |
| ------ | ---- | ------------------------------------------------- | -------- | --- | ------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | --- |
| DG-080 | DG-5 | Unit test completion model/data ≥ 90%             | Test     | P0  |       8 | DG-010, DG-011, DG-012, DG-013, DG-014, DG-015, DG-016, DG-017, DG-018, DG-019, DG-020, DG-021, DG-022, DG-023                                                 | TODO   | —     | —   |
| DG-081 | DG-5 | Browser component test ≥ 85% + edge case          | Test     | P0  |       8 | DG-030, DG-031, DG-032, DG-033, DG-034, DG-035, DG-036, DG-037, DG-038, DG-039, DG-040, DG-041, DG-042, DG-043, DG-044, DG-045, DG-046, DG-047, DG-048, DG-049 | TODO   | —     | —   |
| DG-082 | DG-5 | Performance tuning + benchmark + memory           | Perf     | P0  |       6 | DG-032, DG-033                                                                                                                                                 | TODO   | —     | —   |
| DG-083 | DG-5 | Security hardening + fuzz + CSP E2E               | Security | P0  |       6 | DG-060, DG-061, DG-062, DG-063, DG-064, DG-065, DG-066, DG-067, DG-068, DG-069, DG-070, DG-071, DG-072, DG-073, DG-074, DG-075                                 | TODO   | —     | —   |
| DG-084 | DG-5 | Visual regression baseline 12 skenario × 3 tema   | Test     | P1  |       4 | DG-030, DG-031                                                                                                                                                 | TODO   | —     | —   |
| DG-085 | DG-5 | Memory leak & dispose test 100×                   | Test     | P0  |       3 | DG-050, DG-051, DG-052, DG-053                                                                                                                                 | TODO   | —     | —   |
| DG-086 | DG-5 | Docs + 40 demo + API reference + a11y guide       | Docs     | P0  |      10 | DG-080                                                                                                                                                         | TODO   | —     | —   |
| DG-087 | DG-5 | Panduan upgrade/kompatibilitas + catatan breaking | Docs     | P1  |       2 | DG-002                                                                                                                                                         | TODO   | —     | —   |
| DG-088 | DG-5 | API report final + release candidate              | Release  | P0  |       3 | DG-086                                                                                                                                                         | TODO   | —     | —   |
| DG-089 | DG-5 | Release 1.0 + CDN + smoke test 4 adapter          | Release  | P0  |       3 | DG-088                                                                                                                                                         | TODO   | —     | —   |
| DG-090 | DG-5 | Post-release monitoring + triage bug 30 hari      | Ops      | P1  |       3 | DG-089                                                                                                                                                         | TODO   | —     | —   |

**Gate G-DG5 (GA):** semua gate build; performance & security sign-off; manual
a11y; 0 known critical/high; changeset; smoke test registry.

---

## Aturan update

1. Ambil task → isi `Owner`, ubah `Status` menjadi `WIP`.
2. Buka PR → isi `PR` dengan nomor/URL.
3. Merge → ubah `Status` menjadi `DONE`, isi tanggal di changelog/PR.
4. Blocked → `BLOCKED` + alasan di komentar issue, bukan di tabel.
5. Task batal → `CUT`, jangan hapus baris (jejak audit).
6. Jangan mengubah estimasi task `DONE`; buat task baru jika perlu.
7. Setelah update, jalankan `node docs/10-tracking/tools/progress.mjs --write`.

---

_Untuk fase dan gate, lihat [06-implementation-plan.md](06-implementation-plan.md)._
