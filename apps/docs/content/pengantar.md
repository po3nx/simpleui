# Pengantar

SimpleUI adalah library komponen UI enterprise yang **framework-agnostic**:
satu implementasi perilaku, adapter tipis untuk JavaScript, TypeScript, React,
Vue, dan Angular.

## Prinsip

- **Token-first** — semua warna, spacing, dan tipografi berasal dari token.
- **Aman secara default** — teks dirender sebagai teks, HTML hanya lewat
  sanitizer ber-allowlist.
- **Aksesibel** — target WCAG 2.2 AA, navigasi keyboard, dan live region.
- **Cepat** — virtualisasi untuk data besar dengan budget 16 ms per frame.

## Status

Fondasi runtime sudah tersedia: kernel lifecycle, state, DOM utils, a11y,
layout, i18n, template bridge, data layer, dan virtualizer. Komponen pertama
(DataGrid) sedang dalam pengerjaan.
