# DataGrid 06 — Implementation Plan

> **Status:** Draft v1.0 · **Owner:** Grid squad · **Reviewer:** Tech Lead
> **Prasyarat:** [01 — Scope](01-scope.md) · [07 — Tasks](07-tasks.md) ·
> [08 — Roadmap](../../08-roadmap.md)
> **Asumsi:** tim 3–4 engineer + QA, mulai setelah fondasi (M1).

---

## 1. Ringkasan jadwal

| Fase | Durasi | Mulai | Selesai | Fokus | Gate |
|---|---|---|---|---|---|
| DG-0 | 4 minggu | 2027-01-11 | 2027-02-05 | Kontrak, spike, desain | G-DG0 |
| DG-1 | 5 minggu | 2027-02-08 | 2027-03-12 | Model & data | G-DG1 |
| DG-2 | 5 minggu | 2027-03-15 | 2027-04-16 | Rendering & MVP | G-DG2 (alpha) |
| DG-3 | 6 minggu | 2027-04-19 | 2027-05-28 | Adapter & a11y | G-DG3 |
| DG-4 | 5 minggu | 2027-05-31 | 2027-07-02 | Fitur GA | G-DG4 |
| DG-5 | 5 minggu | 2027-07-05 | 2027-08-06 | Hardening & GA | G-DG5 (GA) |

Total 30 minggu fase (Januari–Agustus 2027). Sebagian pekerjaan berjalan
paralel (adapter, docs, visual test), sehingga beberapa task tidak menambah
critical path:

- DG-1 dan DG-2 overlap 1 minggu (spike renderer).
- Adapter React mulai di DG-2 minggu ke-4.
- Docs, visual, dan a11y track berjalan sejak DG-2.

### Gantt ringkas

```text
2027-01  02   03   04   05   06   07   08
 DG-0 ████
 DG-1     █████
 DG-2         █████
 DG-3             ██████
 DG-4                 █████
 DG-5                     █████
 React      ░░░░░████
 Vue             ░░░████
 Angular          ░░░░████
 A11y        ░░░░░░░████
 Docs        ░░░░░░░░░████
```

`█` = fase utama, `░` = persiapan/paralel.

---

## 2. DG-0 — Kontrak & spike (4 minggu)

### Tujuan

Menghilangkan risiko terbesar sebelum menulis banyak kode:

- virtualizer 100.000 baris;
- template bridge lintas framework;
- API dan desain visual;
- threat model.

### Deliverable

| Task | Deliverable |
|---|---|
| DG-001 | Scope & acceptance criteria final |
| DG-002 | API surface + tipe final (review) |
| DG-003 | Visual spec + token grid |
| DG-004 | Spike virtualizer + benchmark 100k |
| DG-005 | Spike adapter bridge React/Vue/Angular |
| DG-006 | Threat model + payload corpus |
| DG-007 | Test harness + fixture generator |

### Gate G-DG0

- [ ] Virtualizer 100k baris ≥ 55 fps.
- [ ] Adapter bridge mount/update/unmount tanpa leak di 3 framework.
- [ ] Template bridge dapat merender slot/template dari 3 framework.
- [ ] API disetujui tech lead.
- [ ] Threat model disetujui security reviewer.
- [ ] Estimasi DG-1…DG-5 di-refine.

Jika gate gagal: tunda DG-1, perbaiki desain. **Jangan** memaksa masuk
implementasi.

---

## 3. DG-1 — Model & data (5 minggu)

### Deliverable

- Column model + normalisasi + validasi.
- Grid state + transaksi + selector.
- DataController + DataSource/Store integration.
- Query pipeline: filter, sort, group, summary, paging.
- Selection & focus model.
- State persistence schema.
- Unit test 120+.

### Gate G-DG1

- [ ] Model dapat memuat 100k baris lokal dan 100k remote (mock).
- [ ] Sort/filter/group benar untuk edge case.
- [ ] Selection preserve saat reload.
- [ ] Coverage model/data ≥ 90%.
- [ ] Tidak ada dependency DOM di model.

---

## 4. DG-2 — Rendering & MVP (5 minggu)

### Deliverable

- Grid skeleton + CSS layout.
- Header/body/footer renderer.
- Row virtualizer + recycling.
- Column virtualization.
- Cell renderer + format.
- Fitur MVP: sort, filter row, header filter, search, pager, selection,
  resize, reorder, column chooser, CSV export, summary.
- Keyboard navigation.
- Adapter React + vanilla.
- Browser test 50+.

### Gate G-DG2 (alpha)

- [ ] Demo 10k baris 60 fps.
- [ ] Semua fitur MVP dapat dioperasikan keyboard.
- [ ] 0 axe critical.
- [ ] 0 XSS/CSV payload lolos.
- [ ] React + vanilla parity dasar.
- [ ] Coverage komponen ≥ 80%.

---

## 5. DG-3 — Adapter & a11y (6 minggu)

### Deliverable

- Adapter Vue + Angular.
- Parity suite 40 skenario × 4.
- A11y grid pattern lengkap.
- Screen reader test NVDA/VoiceOver.
- SSR test.
- Visual regression 12 baseline.
- Memory leak test.

### Gate G-DG3 (beta)

- [ ] 4 adapter lulus parity.
- [ ] 0 axe serious/critical.
- [ ] Manual a11y pass.
- [ ] SSR `renderToString` lulus.
- [ ] 100× mount/unmount tanpa leak.
- [ ] Design partner beta siap.

---

## 6. DG-4 — Fitur GA (5 minggu)

### Deliverable

- Editing row/cell/popup/batch.
- Validation sync/async.
- Grouping + group summary.
- Master-detail.
- Fixed columns/bands.
- Excel export.
- RTL, print.
- Remote grouping/filter pushdown.
- State persistence UI.
- Docs 30 demo.

### Gate G-DG4

- [ ] Semua fitur P1 selesai.
- [ ] Editing + validation lulus edge case.
- [ ] Grouping 100k baris dalam budget.
- [ ] Excel valid (dibuka di LibreOffice/Excel).
- [ ] RTL visual lulus.
- [ ] Docs fitur GA lengkap.

---

## 7. DG-5 — Hardening & GA (5 minggu)

### Deliverable

- Perbaikan bug beta.
- Performance tuning.
- Security fuzz + hardening.
- API report final.
- Docs 40 demo + API reference.
- Release 1.0 + changelog.
- Post-release monitoring.

### Gate G-DG5 (GA)

- [ ] Semua gate [Build §5.3](../../07-build-release.md#53-gate-wajib).
- [ ] Performance & security sign-off.
- [ ] Manual a11y pass.
- [ ] 0 known critical/high.
- [ ] Changeset + changelog.
- [ ] Smoke test 4 adapter dari registry.

---

## 8. Alokasi tim per fase

| Fase | Core 1 | Core 2 | Adapter | QA | Designer | Security |
|---|---|---|---|---|---|---|
| DG-0 | 100% | 60% | 80% | 40% | 50% | 20% |
| DG-1 | 100% | 100% | 20% | 30% | 10% | 10% |
| DG-2 | 100% | 100% | 60% | 60% | 30% | 10% |
| DG-3 | 70% | 60% | 100% | 100% | 20% | 20% |
| DG-4 | 100% | 100% | 40% | 80% | 20% | 20% |
| DG-5 | 60% | 60% | 40% | 100% | 20% | 40% |

Tech lead 30% sepanjang fase untuk review & keputusan.

---

## 9. Dependency antar task

```text
DG-002 API ─┬─► DG-010 options ─► DG-011 columns ─► DG-031 header
            ├─► DG-012 state ─► DG-013 data ─► DG-014..018 pipeline
            └─► DG-004 virtualizer ─► DG-032 rows ─► DG-033 columns

DG-005 adapter bridge ─► DG-050 React ─► DG-051 Vue ─► DG-052 Angular
DG-006 security ─► DG-083 hardening
DG-007 test harness ─► DG-080/081 tests
```

Aturan: task tidak boleh dimulai sebelum dependency `DONE`, kecuali ada
persetujuan tech lead dan risikonya dicatat.

---

## 10. Risiko dan mitigasi

| Risiko | Prob. | Dampak | Mitigasi |
|---|---|---|---|
| Virtualizer gagal mencapai 60 fps | Sedang | Tinggi | Spike DG-004; fallback fixed height; worker |
| Template bridge terlalu kompleks | Sedang | Tinggi | Spike DG-005; kontrak kecil; batasi template |
| Angular Zone.js menyebabkan loop | Sedang | Sedang | `runOutsideAngular`, OnPush, test khusus |
| Editing edge case meledak | Tinggi | Sedang | Scope ketat; test matrix; tunda fitur non-esensial |
| A11y ditemukan terlambat | Sedang | Tinggi | A11y mulai DG-1; axe di CI; manual di DG-3 |
| Security review terlambat | Sedang | Tinggi | Threat model DG-0; review per fitur |
| Scope creep | Tinggi | Tinggi | Change control; P2 ditunda |
| Dependency core berubah | Rendah | Tinggi | Version pin; integrasi harian |
| Key person sick/leave | Sedang | Sedang | Pairing; dokumentasi; tidak ada silo |
| Design berubah | Sedang | Sedang | Token & visual spec di DG-0; freeze di DG-2 |

---

## 11. Rollout

| Tahap | Audiens | Kriteria | Umpan balik |
|---|---|---|---|
| Internal alpha | Tim internal | G-DG2 | Bug + perf |
| Design partner beta | 3–5 partner | G-DG3 | Use case nyata |
| Release candidate | Partner + internal | G-DG4 | Regression |
| GA 1.0 | Publik | G-DG5 | Issue tracker |
| 1.0.x | Publik | — | Bugfix |

Aturan:

- Beta diberi label `0.x` dan docs "preview".
- Breaking change boleh selama beta, dengan changelog.
- GA hanya setelah tidak ada critical/high.

---

## 12. Komunikasi dan ritme

| Ritme | Isi |
|---|---|
| Daily standup 15 menit | Progress, blocker, dependency |
| Weekly demo | Demo fitur ke stakeholder |
| Weekly risk review | Update risiko & mitigasi |
| Bi-weekly gate check | Cek exit criteria |
| Retrospective per fase | Apa yang berjalan/berubah |

Artefak:

- Task board (GitHub Projects) sinkron dengan `07-tasks.md`.
- Dashboard progress di-generate dari task list.
- ADR untuk keputusan besar.
- Changelog per rilis.

---

## 13. Change control

- Perubahan scope → update `01-scope.md`, `07-tasks.md`, estimasi.
- Perubahan tanggal > 1 minggu → persetujuan tech lead + stakeholder.
- Perubahan arsitektur → ADR.
- Perubahan API publik → review + changeset.
- Task baru → ID baru, estimasi, dependency, owner.

---

## 14. Definisi selesai fase

- [ ] Semua task fase `DONE`.
- [ ] Gate fase lulus.
- [ ] Demo berjalan.
- [ ] Docs diperbarui.
- [ ] Risiko diperbarui.
- [ ] Retrospective selesai.
- [ ] Progress dashboard di-generate ulang.

---

*Task detail ada di [07-tasks.md](07-tasks.md).*
