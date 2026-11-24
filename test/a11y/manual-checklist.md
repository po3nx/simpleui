# Checklist A11y Manual (pra-GA)

Dijalankan sebelum rilis GA komponen, setelah pemeriksaan otomatis
(`tests/e2e/a11y.spec.ts` dengan axe) lulus.

## Screen reader

- [ ] **NVDA + Firefox/Chrome (Windows)** — navigasi grid, header, dan filter
      terbaca dengan role dan state yang benar.
- [ ] **VoiceOver + Safari (macOS)** — pengumuman live region tidak terpotong
      dan tidak berulang.
- [ ] Urutan fokus masuk akal; tidak ada elemen terlewat atau terjebak.
- [ ] `aria-sort`, `aria-selected`, `aria-expanded` sesuai kondisi nyata.

## Keyboard

- [ ] Seluruh fungsi dapat dicapai tanpa mouse (tab, panah, Home/End, Enter,
      Space, Escape).
- [ ] Escape menutup overlay dan mengembalikan fokus ke pemicu.
- [ ] Tidak ada keyboard trap.
- [ ] Fokus terlihat jelas (kontras ≥ 3:1) pada light, dark, dan
      high-contrast.

## Visual dan zoom

- [ ] Zoom 200% tanpa kehilangan konten.
- [ ] Reflow pada lebar 320 px tanpa scroll horizontal.
- [ ] Mode kontras paksa OS (`forced-colors`) tetap terbaca.
- [ ] `prefers-reduced-motion` mematikan animasi.
- [ ] Dark mode dan high-contrast diperiksa ulang terhadap axe.

## Konten dan bahasa

- [ ] Semua teks UI berasal dari katalog i18n; tidak ada string hardcoded.
- [ ] `lang` dokumen benar; teks RTL tidak terbalik dan angka tetap LTR.
- [ ] Pesan error diumumkan lewat live region, bukan hanya warna.

## Catatan

Setiap temuan dicatat sebagai issue dengan label `a11y` dan owner. Checklist ini
harus diselesaikan ulang setiap kali komponen berubah secara visual atau
interaktif.
