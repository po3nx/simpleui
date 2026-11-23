# Charts — Plan Komponen

> **Status:** Planned · **Target:** Charts 1.0 (M6) · **Paket:**
> `@simpleui/charts` + 4 adapter
> **Owner:** Chart squad · **Mulai:** 2027-07-05 · **GA:** 2028-02-11

Chart suite adalah komponen visualisasi dengan scene graph sendiri, renderer
SVG dan Canvas, serta API deklaratif yang konsisten di semua framework.

---

## 1. Mengapa chart dibangun sendiri

| Opsi                     | Kelebihan                                          | Kekurangan                                                                       |
| ------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| Bungkus ECharts/Chart.js | Cepat                                              | Bundle besar, API tidak konsisten dengan SimpleUI, security/a11y di luar kendali |
| D3 sebagai fondasi       | Fleksibel                                          | D3 bukan chart library; tetap membangun lapisan besar                            |
| Scene graph sendiri      | Kontrol penuh, kecil, a11y & security terintegrasi | Effort besar, perlu keahlian grafika                                             |
| **Keputusan**            | **Scene graph sendiri, SVG + Canvas**              | **ADR-0005**                                                                     |

Chart harus:

- konsisten dengan tema/token dan API SimpleUI;
- aman (label teks, tanpa HTML, tanpa evaluasi kode);
- aksesibel (data table alternatif + keyboard);
- cepat untuk 100.000 titik;
- kecil dan tree-shakeable per jenis chart.

---

## 2. Scope

### 2.1 P0 — Cartesian MVP

| Fitur                        | Acceptance criteria                          |
| ---------------------------- | -------------------------------------------- |
| Line, area, bar, stacked bar | Data multi-seri; sumbu benar                 |
| Numeric & category axis      | Tick, label, grid, min/max                   |
| Datetime axis                | Tick adaptif, timezone eksplisit             |
| Legend                       | Toggle seri; keyboard                        |
| Tooltip + crosshair          | Posisi benar; aman; keyboard                 |
| Zoom/pan                     | Mouse + keyboard; reset                      |
| Responsive                   | Resize container; label tidak tumpang tindih |
| Template label               | Teks/format, bukan HTML                      |
| 4 adapter                    | Parity suite                                 |
| A11y                         | `figure`, data table, keyboard exploration   |

### 2.2 P1 — GA 1.0

| Fitur                       | Acceptance criteria                     |
| --------------------------- | --------------------------------------- |
| Scatter & bubble            | Ukuran/opacity; tooltip                 |
| Financial: candlestick/OHLC | Warna naik/turun; sumbu waktu           |
| Pie/donut                   | Label, legend, explode opsional         |
| Polar/radar                 | Multi-seri; sumbu radial                |
| Sparkline & bullet          | Inline, tanpa axis                      |
| Range selector              | Memilih rentang; sinkron dengan chart   |
| Annotations                 | Line/point/band; teks aman              |
| Export PNG/SVG              | Ukuran, background, tanpa data sensitif |
| Animation                   | Hormati reduced motion                  |
| Canvas renderer             | 100.000 titik                           |
| RTL & locale                | Angka/tanggal; layout                   |
| Data table alternatif       | Selalu tersedia                         |

### 2.3 P2 — Pasca-GA

- Treemap, funnel, sankey, gauge.
- WebGL renderer untuk > 1.000.000 titik.
- Chart interaktif dengan brushing/selection lintas chart.
- Dashboard layout integration.
- PDF export.
- Real-time streaming.

---

## 3. Non-goals (1.0)

- 3D chart.
- GIS/map (VectorMap terpisah).
- Diagram (Diagram terpisah).
- Excel/BI authoring.
- AI insight.
- Animasi kompleks berbasis fisika.
- Chart di dalam sel DataGrid sebagai fitur inti (via template diperbolehkan).

---

## 4. Arsitektur

```text
Chart (api)
 ├─ ChartModel (options, data, scales, series)
 ├─ LayoutEngine (plot area, axes, legend, title, annotations)
 ├─ SceneGraph (nodes: group, rect, path, text, circle)
 ├─ Renderer (SVG | Canvas)
 ├─ Interaction (pointer, hover, tooltip, zoom, keyboard)
 └─ Export (PNG/SVG)
```

### 4.1 Scene graph

```ts
type SceneNode =
  | { type: 'group'; children: SceneNode[]; transform?: Transform }
  | { type: 'rect'; x: number; y: number; width: number; height: number; fill?: string; ... }
  | { type: 'path'; d: string; stroke?: string; fill?: string; ... }
  | { type: 'text'; x: number; y: number; text: string; ... }
  | { type: 'circle'; cx: number; cy: number; r: number; ... };
```

- Scene graph murni (tanpa DOM), sehingga dapat diuji dan dirender ke SVG,
  Canvas, atau PNG.
- Node memiliki `id` stabil untuk update incremental.
- Renderer SVG membuat/mengubah elemen; renderer Canvas menggambar ulang
  dirty region (atau full frame untuk kesederhanaan awal).
- Hit testing memakai geometri, bukan DOM (untuk Canvas).

### 4.2 Scales

| Scale    | Domain      | Kegunaan          |
| -------- | ----------- | ----------------- |
| `linear` | number      | Nilai kontinu     |
| `log`    | number > 0  | Data eksponensial |
| `time`   | Date/number | Sumbu waktu       |
| `band`   | kategori    | Bar               |
| `point`  | kategori    | Line/scatter      |

Aturan:

- Domain dihitung dari data + opsi `min`/`max`; nice ticks.
- Timezone eksplisit; DST ditangani oleh `Intl`.
- Tidak ada pembulatan yang mengubah data; hanya tampilan.
- Scale dapat di-invert untuk interaksi.

### 4.3 Series

```ts
interface SeriesOptions<T> {
  type:
    | 'line'
    | 'area'
    | 'bar'
    | 'scatter'
    | 'bubble'
    | 'candlestick'
    | 'ohlc'
    | 'pie'
    | 'radar';
  data: readonly T[];
  xField?: string;
  yField?: string;
  valueField?: string;
  name?: string;
  color?: string;
  axis?: 'left' | 'right';
  stack?: string;
  label?: LabelOptions;
  point?: PointOptions;
  onClick?: (e: SeriesPointEvent<T>) => void;
}
```

Aturan:

- Series tidak memutasi data.
- Path generation murni: `(points, scale) => string`.
- Untuk 100k titik, gunakan decimation/LTTB (opt-in) atau Canvas.
- Series error diisolasi; satu seri gagal tidak menghapus chart.

### 4.4 Layout

- Urutan: title → legend → plot area → axes → annotations.
- Legend dapat di atas/bawah/kiri/kanan; wrap.
- Axis label rotation otomatis; hindari overlap.
- Margin dihitung dari tick label dan legend.
- Responsive: layout ulang saat resize (debounce 100 ms).

### 4.5 Renderer

| Renderer   | Kapan                   | Catatan                                       |
| ---------- | ----------------------- | --------------------------------------------- |
| SVG        | Default, < 10.000 titik | Aksesibel, mudah dianalisis                   |
| Canvas     | > 10.000 titik          | Perlu hit testing manual, a11y via data table |
| PNG export | Ekspor                  | Dari scene graph/Canvas                       |

- Renderer dipilih otomatis berdasarkan jumlah titik, dapat dipaksa.
- Kedua renderer menghasilkan tampilan yang sama (visual test).
- Tidak ada WebGL di 1.0.

---

## 5. API ringkas

```ts
interface ChartOptions<T> {
  dataSource: readonly T[] | DataSource<T>;
  series: readonly SeriesOptions<T>[];
  axes?: { left?: AxisOptions; right?: AxisOptions; bottom?: AxisOptions };
  legend?: { visible: boolean; position: 'top' | 'bottom' | 'left' | 'right' };
  tooltip?: { enabled: boolean; format?: (point) => string };
  crosshair?: { enabled: boolean };
  zoom?: { enabled: boolean; mode: 'mouse' | 'keyboard' | 'both' };
  animation?: { enabled: boolean; duration: number };
  export?: { enabled: boolean; formats: ('png' | 'svg')[] };
  accessibility?: { dataTable: boolean; description?: string };
  theme?: string;
  onPointClick?: (e: PointClickEvent<T>) => void;
  onLegendClick?: (e: LegendClickEvent) => void;
  onZoom?: (e: ZoomEvent) => void;
}
```

Method:

- `render()`, `refresh()`, `dispose()`
- `getSeries()`, `getPoints(seriesId)`
- `zoomTo(range)`, `resetZoom()`
- `exportToPng()`, `exportToSvg()`
- `getState()`, `state(state)`
- `option()`, `beginUpdate()`, `endUpdate()`

Event: `pointClick`, `pointHover`, `legendClick`, `zoom`, `exported`,
`rendered`, `disposing`.

---

## 6. Keamanan

| Ancaman                     | Kontrol                                                       |
| --------------------------- | ------------------------------------------------------------- |
| XSS di label/tooltip        | Teks; HTML tidak didukung                                     |
| XSS di legend/series name   | Teks                                                          |
| Formatter mengeksekusi kode | Hanya fungsi yang disediakan developer; tidak ada string eval |
| URL di tooltip/annotation   | `safeUrl` jika link; default teks                             |
| Export membocorkan data     | Hormati seri tersembunyi; konfirmasi                          |
| DoS data besar              | Batas titik; decimation; Canvas                               |
| Prototype pollution         | `safeMerge`                                                   |
| Dependency                  | Tanpa D3/ECharts; scene graph sendiri                         |

Aturan: semua teks dari data dirender sebagai teks; tidak ada `innerHTML`.

---

## 7. Aksesibilitas

- Container: `role="figure"` dengan `aria-label`/`aria-describedby`.
- Data table alternatif (visually hidden atau toggle) berisi semua titik/seri.
- Keyboard: fokus ke chart, arrow antar titik, `Enter` untuk detail, `Esc`
  reset.
- Live region mengumumkan titik aktif dan nilai.
- Legend dapat difokuskan dan di-toggle dengan keyboard.
- Tooltip muncul pada focus, bukan hanya hover.
- Hormati `prefers-reduced-motion`.
- Kontras seri/warna memenuhi 3:1 terhadap latar; jangan hanya mengandalkan
  warna (pattern/label).

---

## 8. Performance

| Skenario                    | Target       |
| --------------------------- | ------------ |
| Render 10.000 titik SVG     | ≤ 500 ms     |
| Render 100.000 titik Canvas | ≤ 1 detik    |
| Pan/zoom 60 fps             | ≥ 55 fps     |
| Update 1.000 titik          | ≤ 50 ms      |
| Memory 100.000 titik        | ≤ 150 MB     |
| Bundle cartesian            | ≤ 90 KB gzip |

Teknik:

- Decimation/LTTB untuk line > 10.000 titik.
- Canvas untuk dataset besar.
- Offscreen canvas untuk export.
- Batch update; hindari layout read per frame.
- Cache path generation berdasarkan data + scale.

---

## 9. Test plan

| Area        | Test                                                   |
| ----------- | ------------------------------------------------------ |
| Scale       | linear/log/time/band, domain, ticks, invert            |
| Layout      | legend posisi, axis overlap, responsive                |
| Series      | line/area/bar/stack/scatter/bubble/financial/pie/radar |
| Interaction | hover, click, zoom, pan, keyboard, legend toggle       |
| A11y        | figure, data table, live region, keyboard              |
| Visual      | 20 skenario × light/dark × LTR/RTL                     |
| Performance | 10k SVG, 100k Canvas                                   |
| Security    | label/tooltip/annotation payload                       |
| Parity      | 30 skenario × 4 adapter                                |
| Export      | PNG/SVG valid, ukuran, background                      |

Target coverage: scale/series ≥ 90%; komponen ≥ 85%; adapter ≥ 80%.

---

## 10. Jadwal

| Fase | Durasi   | Fokus                                               | Gate         |
| ---- | -------- | --------------------------------------------------- | ------------ |
| CH-0 | 2 minggu | Scope, API, threat model                            | G-CH0        |
| CH-1 | 7 minggu | Scene graph, renderer, scale, axis, layout, tooltip | G-CH1        |
| CH-2 | 7 minggu | Semua jenis seri P0/P1                              | G-CH2        |
| CH-3 | 7 minggu | Interaksi, a11y, adapter, parity                    | G-CH3 (beta) |
| CH-4 | 9 minggu | Test, visual, perf, security, docs, GA              | G-CH4 (GA)   |

Total 32 minggu (2027-07-05 → 2028-02-11), paralel dengan PivotGrid dan
DataGrid GA.

---

## 11. Risiko

| Risiko                            | Dampak         | Mitigasi                            |
| --------------------------------- | -------------- | ----------------------------------- |
| Scope chart terlalu luas          | Molor          | P0/P1 ketat; P2 ditunda             |
| Scene graph lambat                | Performa buruk | Benchmark awal; Canvas              |
| Visual tidak konsisten SVG/Canvas | Bug            | Visual test keduanya                |
| A11y chart sulit                  | Tidak lolos    | Data table sejak awal               |
| Hit testing Canvas                | Bug interaksi  | Unit test geometri                  |
| Export PNG                        | Kualitas       | Offscreen canvas + devicePixelRatio |
| Axis/timezone                     | Bug            | Test DST & locale                   |

---

## 12. Metrik keberhasilan

| Metrik                      | Target    |
| --------------------------- | --------- |
| Time to first chart         | ≤ 5 menit |
| Render 10k SVG              | ≤ 500 ms  |
| 100k Canvas                 | ≤ 1 detik |
| Bundle cartesian            | ≤ 90 KB   |
| Axe serious/critical        | 0         |
| Visual regression flaky     | < 1%      |
| Design partner satisfaction | ≥ 4/5     |

---

## 13. Dokumen

- Task list: [02-tasks.md](02-tasks.md)
- Arsitektur umum: [01 — Arsitektur](../../01-arsitektur.md)
- Theming: [06 — Theming](../../06-theming-a11y-i18n.md)
- Security: [05 — Security](../../05-security.md)
- Testing: [04 — Testing](../../04-testing-strategy.md)

---

_Chart 1.0 fokus pada cartesian + financial + pie/polar; visualisasi lanjutan
masuk P2._
