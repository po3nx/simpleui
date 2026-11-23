# 09 — Estimasi dan Skenario Tim

> **Status:** Draft v1.0 · **Owner:** Tech Lead
> **Metode:** bottom-up per task (lihat `tasks.md`) + analogi historis + contingency.
> **Tingkat keyakinan:** rendah–sedang. Estimasi ini **bukan** komitmen.
> **Satuan:** 1 person-month (PM) = 20 ideal day. 1 ideal day = 6–7 jam fokus.

---

## 1. Jawaban langsung

Pertanyaan: *berapa lama membuat "clone DevExtreme" (library komponen
framework-agnostic) sampai bisa dipakai produksi?*

| Definisi "selesai" | Tim 1 orang | Tim 3 orang | Tim 5–6 orang | Tim 8–10 orang |
|---|---|---|---|---|
| DataGrid MVP (fitur inti, 1–2 adapter) | 16–19 bulan | 7–8 bulan | 4–5 bulan | 4 bulan |
| DataGrid GA (4 adapter, editing, grouping, a11y, security) | 28–32 bulan | 11–13 bulan | 8–9 bulan | 6–7 bulan |
| **Trio: DataGrid + PivotGrid + Chart GA** | 4–5 tahun | 20–23 bulan | **14–16 bulan** | 9–11 bulan |
| Parity penuh ±100 widget | 10+ tahun | ± 5 tahun | 30–36 bulan | 22–28 bulan |

Angka kalender adalah **total dari mulai proyek**, sudah termasuk fondasi,
integrasi, QA, dokumentasi, dan buffer 15–20%. Tanpa buffer, kalender sekitar
15% lebih cepat.

**Rekomendasi:** jangan mengejar "parity penuh" di awal. Bangun fondasi + tiga
komponen flagship, validasi dengan design partner, lalu putuskan apakah
melanjutkan ke parity atau fokus pada diferensiasi.

---

## 2. Asumsi

1. Tim berpengalaman dengan DOM, TypeScript, dan minimal satu framework.
2. Tidak ada kode lama yang harus dimigrasikan.
3. Tidak menyalin kode/aset pihak ketiga; semua dibangun dari nol.
4. Desain visual tersedia atau diputuskan oleh satu designer.
5. CI, lingkungan, dan akses npm tersedia sejak Phase 0.
6. Tidak ada kebutuhan sertifikasi (mis. VPAT) di luar WCAG 2.2 AA.
7. Requirement stabil; perubahan besar menambah waktu.
8. Effort dalam **ideal day**, belum termasuk meeting, cuti, dan overhead
   organisasi (ditambahkan sebagai contingency 20–30%).
9. Angka task list adalah estimasi bottom-up saat ini; akan di-refine setelah
   spike DG-004/DG-005.
10. Tidak ada asumsi "AI meningkatkan produktivitas 2×"; jika ada tooling,
    dampaknya dianggap bonus, bukan baseline.

---

## 3. Effort per workstream

| Workstream | Ideal day | PM | Range PM | Keyakinan |
|---|---:|---:|---:|---|
| Foundation & platform | 130 | 6,5 | 6–8 | Sedang |
| **DataGrid GA** | **353** | **17,7** | **16–20** | Sedang |
| **PivotGrid GA** | **157** | **7,9** | **8–10** | Rendah–sedang |
| **Charts GA** | **191** | **9,6** | **10–14** | Rendah |
| **Subtotal trio** | **831** | **41,6** | **40–52** | |
| Editors & forms (±30 komponen) | 200 | 10,0 | 9–13 | Sedang |
| TreeList | 90 | 4,5 | 4–6 | Sedang |
| Scheduler | 140 | 7,0 | 6–9 | Rendah |
| Gantt | 180 | 9,0 | 8–12 | Rendah |
| VectorMap | 160 | 8,0 | 7–11 | Rendah |
| Diagram | 140 | 7,0 | 6–10 | Rendah |
| FileManager | 100 | 5,0 | 5–7 | Rendah |
| Gauges, range selector, sparkline, bullet, treemap, funnel | 100 | 5,0 | 5–7 | Sedang |
| **Subtotal non-flagship** | **1.110** | **55,5** | **50–65** | |
| **Total fitur (tanpa overhead)** | **1.941** | **97,1** | **90–117** | |
| Overhead docs/QA/security/release (25–35%) | — | **24–34** | | |
| **Total parity penuh** | — | **121–131** | **115–150** | Rendah |

Catatan:

- Angka task list (FND/DG/PV/CH) adalah sumber bottom-up; workstream lain masih
  order-of-magnitude dan akan dipecah saat komponennya dimulai.
- Chart suite sangat bervariasi tergantung jumlah tipe seri dan kedalaman
  interaksi. Estimasi 10–14 PM mengasumsikan scope di
  [Chart plan](components/chart/README.md).
- DataGrid 16–20 PM mencerminkan kompleksitas editing, grouping, virtualisasi,
  a11y, dan 4 adapter. Ini komponen termahal.
- Overhead 25–35% mencakup: dokumentasi, demo, QA manual, security review,
  release engineering, bugfix pasca-rilis awal, dan meeting.

---

## 4. Skenario tim dan kalender

### 4.1 Tim 1 orang (solo senior)

- Foundation: 6,5 PM × 1,3 = 8,5 bulan kalender.
- DataGrid GA: 17,7 × 1,3 = 23,0 bulan **setelah fondasi**; total ± 31,5 bulan.
- Trio: 41,6 × 1,3 = 54,1 bulan (± 4,5 tahun, termasuk fondasi).
- Parity: 125 × 1,3 = 162 bulan (13,5 tahun) — tidak layak.

**Kesimpulan:** solo hanya layak untuk MVP terbatas atau library niche, bukan
parity.

### 4.2 Tim 3 orang (2 core, 1 adapter/QA)

Effective capacity ± 2,4 FTE (memperhitungkan koordinasi, review, cuti).

| Fase | Effort | Kalender (+20% buffer) |
|---|---|---|
| Foundation | 6,5 PM | 3,3 bulan |
| DataGrid GA | 17,7 PM | 8,9 bulan |
| Trio | 41,6 PM | 20,8 bulan |
| Parity | 125 PM | 62 bulan |

DataGrid total ± 12,2 bulan (3,3 bulan fondasi + 8,9 bulan DataGrid). DataGrid
bisa lebih cepat jika adapter ditunda; tetapi 4 adapter adalah syarat GA.

### 4.3 Tim 5–6 orang (referensi)

Komposisi:

- 1 tech lead (50% coding, 50% arsitektur/review)
- 2 core/component engineer
- 1 adapter engineer
- 1 QA/UX engineer
- 0,5 technical writer
- 0,5 security reviewer (shared)

Effective capacity ± 3,8–4,2 FTE.

| Fase | Effort | Kalender | Kumulatif |
|---|---|---|---|
| Foundation | 6,5 PM | 2 bulan | 2 bulan |
| DataGrid GA | 17,7 PM | 6–7 bulan | 8–9 bulan |
| PivotGrid (paralel) | 7,9 PM | 5–6 bulan | 12–13 bulan |
| Charts (paralel) | 10–14 PM | 7–8 bulan | 14–16 bulan |
| **Trio GA** | **41–48 PM** | **14–16 bulan** | |
| Editors/forms | 10 PM | 4–5 bulan | 19–21 bulan |
| Advanced suite | 55 PM | 14–18 bulan | 33–39 bulan |

### 4.4 Tim 8–10 orang

Effective capacity ± 6 FTE. Trio 9–11 bulan, parity 22–28 bulan. Batas
paralelisasi: DataGrid critical path tidak bisa dipercepat tanpa batas; setelah
4–5 engineer, koordinasi dan review menjadi bottleneck.

---

## 5. Kalender referensi (mulai 1 Desember 2026)

| Milestone | Target | Durasi kumulatif |
|---|---|---|
| M0 Plan approved | 2026-11-28 | — |
| M1 Foundation | 2027-01-29 | 2 bulan |
| M2 DataGrid alpha | 2027-04-16 | 4,5 bulan |
| M3 DataGrid beta | 2027-05-28 | 5,9 bulan |
| M4 DataGrid GA | 2027-08-06 | 8,2 bulan |
| M5 PivotGrid GA | 2027-11-19 | 11,7 bulan |
| M6 Charts GA | 2028-02-11 | 14,4 bulan |
| M7 Editors GA | 2028-05-19 | 17,6 bulan |
| M8 Advanced suite | 2029-06-29 | 31 bulan |

Dengan buffer 15%: trio GA paling lambat **Maret 2028** (± 16 bulan).

---

## 6. Breakdown effort DataGrid

| Kelompok | Ideal day | % |
|---|---:|---:|
| DG-0 Kontrak & spike | 24 | 7% |
| DG-1 Model & data | 60 | 17% |
| DG-2 Rendering & MVP | 85 | 24% |
| DG-3 Adapter & a11y | 55 | 16% |
| DG-4 Fitur GA | 73 | 21% |
| DG-5 Hardening & GA | 56 | 16% |
| **Total** | **353** | **100%** |

Kesimpulan:

- Rendering + model = 41% effort; ini fondasi yang tidak boleh dipotong.
- Adapter + a11y = 16%; jangan dianggap "tinggal bungkus".
- Fitur GA (editing/grouping/export) = 21%; bisa ditunda ke 1.1 jika perlu
  mempercepat beta.

---

## 7. Critical path

```text
FND core kernel ─► DG column/state model ─► DG renderer/virtualizer
   ─► DG data pipeline ─► DG fitur MVP ─► adapter React ─► parity suite
   ─► a11y/security hardening ─► DG GA ─► PivotGrid/Charts GA
```

Bottleneck:

1. **Virtualizer + row recycling** — jika gagal, seluruh performa grid gagal.
2. **Template bridge** — jika rumit, adapter Vue/Angular terlambat.
3. **Editing + validation** — kompleks dan banyak edge case.
4. **A11y grid pattern** — sering ditemukan terlambat; harus dimulai di P1.
5. **Security review** — jangan menunggu GA; lakukan per fitur.

Mitigasi: spike awal (DG-004, DG-005), review mingguan, dan definition of done
yang ketat.

---

## 8. Faktor yang menggeser estimasi

| Faktor | Dampak |
|---|---|
| Requirement berubah > 20% | +15–30% |
| Tidak ada designer | +10–20% (desain sambil jalan) |
| Hanya 1 framework adapter | −8–10% |
| Tidak perlu Angular | −6–8% |
| Perlu SSR hydration penuh | +10–20% |
| Perlu dukungan mobile/touch mendalam | +10–15% |
| Perlu ekspor Excel kompleks/PDF | +5–8% |
| Perlu localization > 5 bahasa | +3–5% |
| Perlu sertifikasi a11y formal (VPAT) | +5–10% |
| Tim baru di domain grid | +20–35% |
| Turnover engineer kunci | +15–25% |
| Dependency kritis berubah breaking | +5–15% |

---

## 9. Build vs buy (jujur)

| Opsi | Kelebihan | Kekurangan | Cocok jika |
|---|---|---|---|
| **Beli DevExtreme** | Parity luas, matang, support | Lisensi, lock-in, arsitektur lama, sulit dikustomisasi dalam | Butuh cepat, budget ada |
| **AG Grid / Handsontable** | Grid sangat kuat | Fokus grid, lisensi enterprise untuk fitur tertentu | Kebutuhan utama grid |
| **ECharts / Chart.js** | Chart matang | Bukan grid/pivot; integrasi terpisah | Kebutuhan utama chart |
| **TanStack Table + custom UI** | Headless, fleksibel | Anda membangun UI, a11y, editing sendiri | Tim kuat, kebutuhan unik |
| **Bangun SimpleUI** | Kontrol penuh, security/a11y/framework konsisten, IP sendiri | Mahal, multi-tahun, risiko eksekusi | Diferensiasi & jangka panjang |

**Decision gate di M2 (alpha):** jika DataGrid alpha sudah memenuhi 80% use case
dan tim menilai biaya 3 komponen berikutnya terlalu tinggi, pertimbangkan
strategi hybrid: bangun DataGrid + Chart, gunakan library lain untuk PivotGrid,
atau lisensi komponen tertentu. Keputusan ini harus melalui ADR, bukan
diam-diam.

---

## 10. Biaya tersembunyi

- **QA manual a11y** (screen reader, keyboard, zoom) — 5–8% effort.
- **Dokumentasi & demo** — 8–12% effort; sering diremehkan.
- **Release engineering** — 3–5% effort, berulang tiap rilis.
- **Security review & dependency update** — 3–5% per tahun.
- **Bugfix pasca-rilis** — 10–15% kapasitas tim setelah GA.
- **Support/community** — 0,5–1 FTE setelah adopsi.

---

## 11. Cara memperbarui estimasi

1. Setiap task selesai: catat actual day vs estimate.
2. Setiap akhir phase: hitung velocity (ideal day selesai / minggu).
3. Re-baseline kalender dengan velocity aktual, bukan asumsi.
4. Update [progress dashboard](10-tracking/progress.md) dan dokumen ini.
5. Jika variance > 20%, buat catatan risiko dan opsi scope.

---

## 12. Ringkasan untuk stakeholder

- **DataGrid MVP:** 4–5 bulan (tim 5–6).
- **DataGrid GA:** 8–9 bulan (termasuk fondasi 2 bulan).
- **Trio GA:** 14–16 bulan.
- **Parity penuh:** 30–36 bulan.
- **Risiko terbesar:** kompleksitas grid/pivot, kualitas adapter, dan
  konsistensi a11y.
- **Keputusan terbesar:** berapa lama dan seberapa luas sebelum validasi pasar.
- **Rekomendasi:** mulai dari fondasi + DataGrid, validasi di bulan ke-6,
  lalu putuskan lanjut ke PivotGrid/Charts atau fokus.

---

*Angka task-level ada di [DataGrid tasks](components/datagrid/07-tasks.md),
[PivotGrid tasks](components/pivotgrid/02-tasks.md), dan
[Chart tasks](components/chart/02-tasks.md).*
