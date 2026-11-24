# Progress Dashboard

> **Status:** Generated · **Sumber:** `foundation-tasks.md` dan `tasks.md` per
> komponen.
> **Jangan edit** isi di antara `PROGRESS:START` dan `PROGRESS:END` secara
> manual. Jalankan:
>
> ```bash
> node docs/10-tracking/tools/progress.mjs --write
> ```
>
> Legenda: `DONE` · `WIP` · `BLOCKED` · `TODO` · `CUT`.
> Progress berbobot = estimasi `DONE` / estimasi total (tanpa `CUT`).

---

<!-- PROGRESS:START -->

## Ringkasan Progress

**5,2%** dari total estimasi **831 ideal day** selesai (43 day). Task: 174 aktif, 0 dibatalkan.

| Status | Task | Estimasi (d) |
|---|---:|---:|
| DONE | 13 | 43 |
| WIP | 0 | 0 |
| BLOCKED | 0 | 0 |
| TODO | 161 | 788 |
| CUT | 0 | 0 |

Estimasi WIP: 0 day · estimasi BLOCKED: 0 day.

### Progress per komponen

| Komponen | Task | DONE | WIP | BLOCKED | TODO | CUT | Est total | Est DONE | Progress |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Foundation | 35 | 13 | 0 | 0 | 22 | 0 | 130 | 43 | 33,1% |
| DataGrid | 77 | 0 | 0 | 0 | 77 | 0 | 353 | 0 | 0,0% |
| PivotGrid | 29 | 0 | 0 | 0 | 29 | 0 | 157 | 0 | 0,0% |
| Charts | 33 | 0 | 0 | 0 | 33 | 0 | 191 | 0 | 0,0% |

### Progress per fase

| Fase | Task | Est (d) | Est DONE | Progress |
|---|---:|---:|---:|---:|
| P0 | 35 | 130 | 43 | 33,1% |
| DG-0 | 7 | 24 | 0 | 0,0% |
| DG-1 | 14 | 60 | 0 | 0,0% |
| DG-2 | 20 | 85 | 0 | 0,0% |
| DG-3 | 9 | 55 | 0 | 0,0% |
| DG-4 | 16 | 73 | 0 | 0,0% |
| DG-5 | 11 | 56 | 0 | 0,0% |
| PV-0 | 3 | 9 | 0 | 0,0% |
| PV-1 | 6 | 38 | 0 | 0,0% |
| PV-2 | 5 | 27 | 0 | 0,0% |
| PV-3 | 6 | 25 | 0 | 0,0% |
| PV-4 | 5 | 37 | 0 | 0,0% |
| PV-5 | 4 | 21 | 0 | 0,0% |
| CH-0 | 3 | 9 | 0 | 0,0% |
| CH-1 | 7 | 45 | 0 | 0,0% |
| CH-2 | 8 | 45 | 0 | 0,0% |
| CH-3 | 8 | 45 | 0 | 0,0% |
| CH-4 | 7 | 47 | 0 | 0,0% |

### Siap dikerjakan

Task `TODO` yang seluruh dependency-nya sudah `DONE`.

| ID | Task | Komponen | Est (d) | Owner |
|---|---|---|---:|---|
| CH-001 | Finalisasi scope, taksonomi chart, acceptance criteria | Charts | 3 | — |
| DG-001 | Finalisasi scope, non-goals, dan acceptance criteria | DataGrid | 2 | — |
| FND-012 | Reactive store + transaksi + selector + scheduler | Foundation | 6 | — |
| FND-013 | DOM utils: element, class, attr, style, scroll | Foundation | 4 | — |
| FND-016 | i18n + Intl format + message catalog + RTL | Foundation | 5 | — |
| FND-017 | Template bridge contract + vanilla implementation | Foundation | 6 | — |
| FND-020 | Testing harness adapter + fixture factory + seeded random | Foundation | 5 | — |
| FND-021 | Docs site skeleton + navigasi + contoh | Foundation | 5 | — |
| FND-022 | Security utils: safeMerge, safeUrl, sanitizer facade, CSV guard | Foundation | 6 | — |
| FND-023 | Benchmark harness + baseline + reporting | Foundation | 3 | — |
| FND-026 | Supply chain: lockfile, audit, SBOM, provenance | Foundation | 2 | — |
| FND-027 | Browser/framework support matrix + CI matrix | Foundation | 2 | — |

### Blocked

_Tidak ada task blocked._

### Validasi

✅ Tidak ada error. 174 task terbaca dari 4 file.

_Dashboard ini di-generate oleh `docs/10-tracking/tools/progress.mjs`. Jangan mengedit bagian di antara marker secara manual._
<!-- PROGRESS:END -->

---

## Cara membaca

- **Estimasi (d)** adalah ideal day, bukan hari kalender.
- **Progress** tidak sama dengan kesiapan rilis; gunakan gate milestone di
  [roadmap](../08-roadmap.md).
- **Siap dikerjakan** hanya menampilkan task yang dependency-nya sudah `DONE`;
  task lain mungkin memerlukan keputusan/desain.
- **Blocked** harus punya issue dan owner; jangan dibiarkan > 2 hari.

## Snapshot manual (opsional)

Catatan mingguan boleh ditambahkan **di luar** marker, misalnya:

```text
Minggu 2027-W05
- Fokus: DG-004 virtualizer
- Risiko: fps belum stabil di Firefox
- Keputusan: tetap fixed row height untuk 1.0
```

## Riwayat

| Tanggal | Progress | Catatan |
|---|---|---|
| 2026-11-23 | 1,2% | 11 ADR + scaffold monorepo (FND-001/002/003, 10 ideal day) |
