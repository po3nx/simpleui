# ADR-0005 — Chart Engine: Scene Graph Sendiri

> **Status:** Accepted · **Tanggal:** 2026-11-23 · **Owner:** Tech Lead
> **Reviewer:** Chart Squad, Security Reviewer
> **Menggantikan:** — · **Berlaku sampai:** ditinjau pada Charts GA

---

## 1. Konteks

Chart suite harus:

- konsisten dengan tema, API, dan a11y SimpleUI;
- aman (tanpa HTML/eval dari data);
- cepat untuk 100.000 titik;
- kecil dan tree-shakeable per jenis chart;
- tidak menambah dependency besar.

Pilihan utamanya: membungkus library chart yang sudah ada, memakai D3 sebagai
fondasi, atau membangun scene graph sendiri.

---

## 2. Keputusan

> Kami memutuskan membangun **scene graph sendiri** dengan renderer **SVG**
> (default) dan **Canvas** (dataset besar), tanpa runtime D3/ECharts/Chart.js.

Detail:

- Scene graph murni (group, rect, path, text, circle) tanpa DOM.
- Renderer SVG untuk aksesibilitas dan dataset kecil/menengah.
- Renderer Canvas untuk > 10.000 titik; hit testing berbasis geometri.
- Scale internal: linear, log, time, band, point.
- Layout engine: title, legend, plot area, axes, annotations.
- Pemilihan renderer otomatis berdasarkan jumlah titik; dapat dipaksa.
- Tidak ada WebGL di 1.0; dapat ditambahkan lewat ADR baru.
- Tidak ada `eval`/string formatter; formatter adalah fungsi yang disediakan
  developer.

---

## 3. Alternatif yang dipertimbangkan

| Alternatif | Kelebihan | Kekurangan | Alasan tidak dipilih |
|---|---|---|---|
| Bungkus ECharts | Cepat, fitur luas | Bundle besar, API/a11y/security di luar kendali | Tidak konsisten |
| Bungkus Chart.js | Ringan, populer | Kurang cocok untuk financial/polar kompleks | Kontrol terbatas |
| D3 sebagai fondasi | Fleksibel | D3 bukan chart library; tetap bangun lapisan besar | Kompleksitas tersembunyi |
| Scene graph sendiri | Kontrol penuh, kecil, a11y/security terintegrasi | Effort besar, memerlukan keahlian grafika | **Dipilih** |
| Web Components chart | Isolasi | Styling/SSR rumit | Ditunda |

---

## 4. Konsekuensi

### Positif

- API, tema, a11y, dan security konsisten dengan komponen lain.
- Bundle dapat dipecah per jenis chart.
- Tidak ada dependency chart pihak ketiga.
- Scene graph dapat diuji tanpa browser.

### Negatif / risiko

- Effort 10–14 PM; lebih besar dari membungkus library.
- Perlu keahlian grafika dan optimasi.
- Fitur niche (treemap, sankey, WebGL) tertunda.

### Mitigasi

- Scope P0/P1 ketat; P2 ditunda.
- Renderer SVG lebih dulu; Canvas setelah stabil.
- Benchmark 10k/100k titik di CI.
- Review desain di gate CH-1.

---

## 5. Keamanan dan privasi

- Label, tooltip, legend, annotation dirender sebagai teks; tidak ada HTML.
- Formatter tidak menerima string kode; hanya fungsi.
- Export PNG/SVG tidak menyertakan data tersembunyi secara default.
- Tidak ada request jaringan dari chart.
- Data besar dibatasi; decimation/Canvas mencegah DoS.
- Tidak ada `eval` di ekspresi sumbu/series.

---

## 6. Kompatibilitas dan migrasi

- API chart adalah public API; perubahan breaking butuh major.
- Renderer SVG dan Canvas harus menghasilkan visual yang setara; diuji visual.
- Jika di masa depan memakai WebGL, API tetap sama; renderer menjadi detail.
- Tidak ada migrasi dari library lain; ini implementasi baru.

---

## 7. Implementasi

| Item | Detail |
|---|---|
| Scene graph | CH-004 |
| SVG/Canvas | CH-005, CH-006 |
| Scale/axis/layout | CH-007…CH-009 |
| Series | CH-011…CH-018 |
| A11y | CH-024 |
| Perf | CH-029 |
| Target | CH-1 gate; GA M6 |

---

## 8. Referensi

- [Charts plan](../components/chart/README.md)
- [Theming/a11y](../06-theming-a11y-i18n.md)
- [Security §3](../05-security.md#3-xss-dan-rendering)

---

## Catatan review

| Tanggal | Reviewer | Keputusan | Catatan |
|---|---|---|---|
| 2026-11-23 | Tech Lead | Setuju | Scene graph sendiri |
| 2026-11-23 | Chart Squad | Setuju dengan risiko | Butuh spike performa awal |
| 2026-11-23 | Security Reviewer | Setuju | Tanpa HTML/eval |
