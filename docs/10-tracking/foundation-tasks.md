# Foundation — Task List & Tracking

> **Status:** Draft v1.0 · **Owner:** Core squad · **Fase:** P0 (2026-12-01 →
> 2027-01-29)
> **Sumber kebenaran status:** file ini.
> **Estimasi:** ideal day. Legenda: `TODO` · `WIP` · `DONE` · `BLOCKED` · `CUT`.

---

## Ringkasan

| Kelompok                               |   Task | Estimasi (ideal day) |
| -------------------------------------- | -----: | -------------------: |
| A. Repo & tooling                      |      9 |                   26 |
| B. Core runtime                        |     10 |                   56 |
| C. Quality, docs, governance & release |     16 |                   48 |
| **Total**                              | **35** |              **130** |

---

## A. Repo & tooling

| ID      | Fase | Task                                                  | Area    | Pri | Est (d) | Depends                   | Status | Owner     | PR         |
| ------- | ---- | ----------------------------------------------------- | ------- | --- | ------: | ------------------------- | ------ | --------- | ---------- |
| FND-001 | P0   | Scaffold monorepo pnpm + workspace + struktur package | Tooling | P0  |       3 | —                         | DONE   | Tech Lead | scaffold   |
| FND-002 | P0   | Konfigurasi Turborepo + cache + pipeline              | Tooling | P0  |       2 | FND-001                   | DONE   | Tech Lead | turbo.json |
| FND-003 | P0   | TypeScript project references + tsconfig base strict  | Tooling | P0  |       3 | FND-001                   | DONE   | Tech Lead | tsconfig   |
| FND-004 | P0   | ESLint flat config + Prettier + import rules          | Tooling | P0  |       3 | FND-003                   | DONE   | Tech Lead | FND-004    |
| FND-005 | P0   | Vitest workspace + coverage + setup browser mode      | Test    | P0  |       3 | FND-003                   | DONE   | Tech Lead | FND-005    |
| FND-006 | P0   | Playwright config + browser matrix + trace            | Test    | P0  |       3 | FND-001                   | DONE   | Tech Lead | FND-006    |
| FND-007 | P0   | CI pipeline PR + cache + sharding + gate              | CI      | P0  |       4 | FND-004, FND-005, FND-006 | DONE   | Tech Lead | FND-007    |
| FND-008 | P0   | Changesets + versioning fixed group + changelog       | Release | P0  |       3 | FND-001                   | DONE   | Tech Lead | FND-008    |
| FND-009 | P0   | Export map + publint + arethetypeswrong               | Build   | P0  |       2 | FND-003                   | TODO   | —         | —          |

**Gate A:** `pnpm install`, `lint`, `typecheck`, `test`, `build` hijau di Node
22 & 24; CI PR < 15 menit.

---

## B. Core runtime

| ID      | Fase | Task                                                      | Area  | Pri | Est (d) | Depends | Status | Owner | PR  |
| ------- | ---- | --------------------------------------------------------- | ----- | --- | ------: | ------- | ------ | ----- | --- |
| FND-010 | P0   | Design token + CSS layer + tema light/dark/HC/density/RTL | Theme | P0  |       5 | FND-001 | TODO   | —     | —   |
| FND-011 | P0   | Core kernel: lifecycle, options, events, disposal         | Core  | P0  |       8 | FND-003 | TODO   | —     | —   |
| FND-012 | P0   | Reactive store + transaksi + selector + scheduler         | Core  | P0  |       6 | FND-011 | TODO   | —     | —   |
| FND-013 | P0   | DOM utils: element, class, attr, style, scroll            | Core  | P0  |       4 | FND-011 | TODO   | —     | —   |
| FND-014 | P0   | Focus manager + keyboard + roving tabindex + announcer    | A11y  | P0  |       5 | FND-013 | TODO   | —     | —   |
| FND-015 | P0   | ResizeObserver + layout service + cleanup                 | Core  | P0  |       3 | FND-013 | TODO   | —     | —   |
| FND-016 | P0   | i18n + Intl format + message catalog + RTL                | Core  | P0  |       5 | FND-011 | TODO   | —     | —   |
| FND-017 | P0   | Template bridge contract + vanilla implementation         | Core  | P0  |       6 | FND-011 | TODO   | —     | —   |
| FND-018 | P0   | DataSource, ArrayStore, CustomStore, cache, abort         | Data  | P0  |       8 | FND-012 | TODO   | —     | —   |
| FND-019 | P0   | Virtualizer primitive + benchmark 100k                    | Core  | P0  |       6 | FND-013 | TODO   | —     | —   |

**Gate B:** kernel & store unit-tested; virtualizer 100k ≥ 55 fps; template
bridge vanilla berfungsi; tidak ada akses DOM top-level.

---

## C. Quality, docs, governance & release

| ID      | Fase | Task                                                                     | Area     | Pri | Est (d) | Depends          | Status | Owner     | PR       |
| ------- | ---- | ------------------------------------------------------------------------ | -------- | --- | ------: | ---------------- | ------ | --------- | -------- |
| FND-020 | P0   | Testing harness adapter + fixture factory + seeded random                | Test     | P0  |       5 | FND-005          | TODO   | —         | —        |
| FND-021 | P0   | Docs site skeleton + navigasi + contoh                                   | Docs     | P0  |       5 | FND-001          | TODO   | —         | —        |
| FND-022 | P0   | Security utils: safeMerge, safeUrl, sanitizer facade, CSV guard          | Security | P0  |       6 | FND-011          | TODO   | —         | —        |
| FND-023 | P0   | Benchmark harness + baseline + reporting                                 | Perf     | P1  |       3 | FND-005          | TODO   | —         | —        |
| FND-024 | P0   | Review & publish ADR-0001…0011                                           | Process  | P1  |       2 | —                | DONE   | Tech Lead | docs/adr |
| FND-025 | P0   | License/IP review + NOTICE + dependency allowlist                        | Legal    | P0  |       2 | —                | TODO   | —         | —        |
| FND-026 | P0   | Supply chain: lockfile, audit, SBOM, provenance                          | Security | P0  |       2 | FND-007          | TODO   | —         | —        |
| FND-027 | P0   | Browser/framework support matrix + CI matrix                             | Tooling  | P1  |       2 | FND-007          | TODO   | —         | —        |
| FND-028 | P0   | Storybook/playground 4 framework                                         | DX       | P1  |       4 | FND-021          | TODO   | —         | —        |
| FND-029 | P0   | API Extractor + `.api.md` + perubahan gate                               | Build    | P0  |       2 | FND-009          | TODO   | —         | —        |
| FND-030 | P0   | Size-limit + performance budget per paket                                | Perf     | P0  |       2 | FND-009          | TODO   | —         | —        |
| FND-031 | P0   | Setup axe + keyboard E2E + a11y checklist                                | A11y     | P0  |       3 | FND-006          | TODO   | —         | —        |
| FND-032 | P0   | Setup visual regression + baseline awal                                  | Test     | P1  |       3 | FND-006          | TODO   | —         | —        |
| FND-033 | P0   | Release smoke test: install dari tarball + CDN                           | Release  | P0  |       3 | FND-008          | TODO   | —         | —        |
| FND-034 | P0   | Contributor docs + PR template + security policy + CODEOWNERS/governance | Docs     | P1  |       2 | FND-024          | TODO   | —         | —        |
| FND-035 | P0   | Gate P0 review + retro + re-baseline                                     | Process  | P0  |       2 | FND-033, FND-034 | TODO   | —         | —        |

---

## Aturan update

Sama dengan [DataGrid tasks §Aturan update](../components/datagrid/07-tasks.md#aturan-update).
Jalankan `node docs/10-tracking/tools/progress.mjs --write` setelah perubahan.
