# Tracking Progress

> **Status:** Draft v1.0 · **Owner:** Tech Lead / PM
> **Tujuan:** satu cara yang konsisten untuk mencatat, menghitung, dan
> melaporkan progress implementasi.

---

## 1. Prinsip

1. **Satu sumber kebenaran** — status task hanya diubah di file `tasks.md`
   komponen (dan `foundation-tasks.md`).
2. **Task kecil dan terukur** — setiap task punya ID, estimasi, dependency,
   dan acceptance criteria.
3. **Progress berbobot** — dihitung dari estimasi, bukan jumlah task.
4. **Transparan** — dashboard di-generate, bukan ditulis manual.
5. **Audit trail** — task yang dibatalkan ditandai `CUT`, tidak dihapus.
6. **Tidak ada status ganda** — issue/board hanya cermin, bukan sumber.

---

## 2. File

| File | Isi |
|---|---|
| [foundation-tasks.md](foundation-tasks.md) | Task FND (Phase 0) |
| [../components/datagrid/07-tasks.md](../components/datagrid/07-tasks.md) | Task DG |
| [../components/pivotgrid/02-tasks.md](../components/pivotgrid/02-tasks.md) | Task PV |
| [../components/chart/02-tasks.md](../components/chart/02-tasks.md) | Task CH |
| [master-backlog.md](master-backlog.md) | Epic & dependency lintas komponen |
| [progress.md](progress.md) | Dashboard (generated) |
| [tools/progress.mjs](tools/progress.mjs) | Script validasi & generate |

---

## 3. Cara update status

### 3.1 Format tabel (wajib)

Setiap task memakai tabel dengan header:

```markdown
| ID | Fase | Task | Area | Pri | Est (d) | Depends | Status | Owner | PR |
|---|---|---|---|---|---:|---|---|---|---|
```

Aturan:

- `ID` unik, format `PREFIX-NNN` (contoh `DG-032`).
- `Est (d)` angka bulat/desimal, satuan ideal day.
- `Depends` berisi ID dipisah koma, atau `—`.
- `Status` salah satu: `TODO`, `WIP`, `DONE`, `BLOCKED`, `CUT`.
- `Owner` nama/initials; `—` jika belum diambil.
- `PR` nomor/URL; `—` jika belum ada.

Script parser bergantung pada header ini; jangan mengubah urutan kolom tanpa
memperbarui script.

### 3.2 Alur

```text
Todo → ambil task → WIP (isi Owner)
     → buka PR (isi PR)
     → review & merge
     → DONE
     → generate dashboard
```

Jika blocked:

1. Ubah status ke `BLOCKED`.
2. Buat issue dengan label `blocked` + alasan + dependency.
3. Catat di daily standup.
4. Setelah unblock, kembali ke `WIP` (bukan `TODO`).

Jika batal:

1. Ubah status ke `CUT`.
2. Jangan hapus baris.
3. Catat alasan di changelog/issue.
4. Estimasi `CUT` tidak dihitung di denominator progress.

### 3.3 Aturan lainnya

- **DILARANG** mengubah estimasi task `DONE`; buat task baru untuk pekerjaan
  tambahan.
- **DILARANG** menandai `DONE` tanpa PR/commit dan test.
- **DILARANG** menandai `DONE` jika acceptance criteria belum terpenuhi.
- Satu task = satu PR idealnya; PR besar dipecah.
- Update minimal 2× seminggu (Senin & Kamis).

---

## 4. Progress

### 4.1 Rumus

```text
progress (%) = Σ estimasi task DONE / Σ estimasi task (semua kecuali CUT) × 100
```

- Task `BLOCKED` dihitung di denominator dan dilaporkan terpisah.
- Task `WIP` tidak dihitung selesai.
- Progress per komponen dan per fase dihitung dengan rumus yang sama.

### 4.2 Contoh

| Task | Est | Status |
|---|---:|---|
| DG-001 | 2 | DONE |
| DG-002 | 3 | DONE |
| DG-003 | 3 | WIP |
| DG-004 | 4 | TODO |

Progress = (2 + 3) / (2 + 3 + 3 + 4) = 5/12 = **41,7%**.

### 4.3 Interpretasi

| Progress | Arti |
|---|---|
| 0–10% | Fondasi, belum ada fitur |
| 10–40% | Fitur inti berjalan, banyak edge case |
| 40–70% | Beta, integrasi & a11y |
| 70–90% | Hardening, docs, security |
| 90–100% | Release candidate; **hati-hati**: 90% terakhir sering paling lama |

Progress bukan pengganti milestone gate; gunakan keduanya.

---

## 5. Otomasi

### 5.1 Perintah

```bash
# validasi + cetak ringkasan
node docs/10-tracking/tools/progress.mjs

# validasi saja (exit 1 jika ada error)
node docs/10-tracking/tools/progress.mjs --check

# generate ulang progress.md
node docs/10-tracking/tools/progress.mjs --write
```

### 5.2 Yang divalidasi

- ID duplikat.
- Dependency tidak dikenal.
- Dependency pada diri sendiri.
- Siklus dependency.
- Status tidak valid.
- Estimasi kosong/negotif.
- Task tanpa fase/area.
- Baris tabel yang tampak seperti task tetapi tidak lengkap.

### 5.3 Integrasi CI

Workflow `docs-check.yml` menjalankan `--check` pada setiap PR yang menyentuh
`docs/**`. PR gagal jika:

- ada error validasi;
- file `progress.md` tidak diperbarui padahal task berubah (opsional,
  peringatan).

### 5.4 GitHub Projects

- Sinkronisasi satu arah: `tasks.md` → issue/board.
- ID task menjadi label (`task:DG-032`).
- Status board harus sama; jika berbeda, `tasks.md` yang benar.
- Script sinkronisasi (opsional) membaca tabel dan membuat/menutup issue.

---

## 6. Ritme pelaporan

| Waktu | Laporan | Audiens |
|---|---|---|
| Harian | Standup: WIP, blocker, dependency | Tim |
| Senin | Progress + rencana minggu | Tim |
| Kamis | Progress + risiko | Tech lead |
| Akhir fase | Gate review + retro + re-baseline | Stakeholder |
| Bulanan | Ringkasan eksekutif (progress, risiko, biaya) | Sponsor |

Template ringkasan mingguan:

```text
Minggu: 2027-W05
Progress total: 18% (baseline 20%)
Selesai: DG-001, DG-002, FND-010
WIP: DG-003 (Rina), DG-011 (Budi)
Blocked: DG-004 (menunggu benchmark environment)
Risiko: virtualizer belum mencapai target fps
Rencana: selesaikan DG-004, mulai DG-012
```

---

## 7. Definition of Done untuk task

Task hanya `DONE` jika:

- [ ] Kode merged ke `main`.
- [ ] Unit test + edge case lulus.
- [ ] Test browser/adapter (jika relevan) lulus.
- [ ] A11y test (jika interaktif) lulus.
- [ ] Security test (jika berisiko) lulus.
- [ ] Docs/changeset diperbarui.
- [ ] Tidak ada `TODO`/`FIXME` tanpa ID.
- [ ] Acceptance criteria terpenuhi.
- [ ] PR direview.
- [ ] Progress dashboard di-generate ulang.

Jika salah satu belum, status tetap `WIP`.

---

## 8. Perubahan scope

- Task baru: tambah baris + estimasi + dependency + alasan.
- Task dihapus: ubah `CUT`, jangan hapus.
- Perubahan estimasi > 20%: catat di changelog task + review tech lead.
- Perubahan tanggal milestone: update [roadmap](../08-roadmap.md) dan
  [estimasi](../09-estimasi.md).
- Perubahan arsitektur: ADR.

---

## 9. Metrik tim

| Metrik | Rumus | Target |
|---|---|---|
| Velocity | ideal day DONE / minggu | Stabil setelah 4 minggu |
| Throughput | jumlah task DONE / minggu | Naik bertahap |
| WIP | jumlah task WIP | ≤ jumlah engineer |
| Cycle time | waktu WIP → DONE | ≤ 5 hari |
| Blocked time | hari task BLOCKED | ≤ 2 hari |
| Estimate accuracy | actual / estimate | 0,8–1,25 |
| Rework | task dibuka kembali / total | < 10% |

Gunakan untuk memperbaiki estimasi, bukan menghukum tim.

---

## 10. Akses dan kepemilikan

- Semua engineer boleh mengubah status task miliknya.
- Tech lead boleh mengubah estimasi/scope.
- PM boleh menambah task baru.
- Perubahan struktur tabel/script harus disetujui tech lead.

---

*Dashboard: [progress.md](progress.md) · Epic: [master-backlog.md](master-backlog.md)*
