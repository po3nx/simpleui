# Visual regression

Baseline screenshot area komponen, bukan seluruh halaman (docs/04 §9).

```bash
pnpm build                             # docs + theme
pnpm test:visual                       # bandingkan dengan baseline
pnpm test:visual:update                # tulis baseline (wajib di-review!)
```

## Aturan

- Threshold `maxDiffPixelRatio: 0.01`.
- Nama file baseline memuat platform (`-darwin`, `-linux`) karena rendering
  font berbeda antar OS; jangan salin baseline antar platform.
- **DILARANG** menerima update baseline otomatis tanpa inspeksi. Setiap
  perubahan baseline harus dijelaskan di PR (apa yang berubah dan mengapa).
- Skenario bertambah bersama komponen: demo 10.000 baris (light/dark/
  high-contrast, scroll) dan DataGrid (`grid.spec.ts`: light/dark/high-contrast,
  hasil search, layout sempit+scroll horizontal).
