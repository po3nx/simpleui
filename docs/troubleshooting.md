# Troubleshooting Instalasi

> Dokumen pendukung untuk lingkungan yang **tidak umum**: proxy korporat,
> kebijakan npm yang ketat, atau Windows. Instalasi normal cukup mengikuti
> [Quick start di README](../README.md#quick-start).
>
> Kasus di bawah adalah workaround lingkungan, bukan perilaku proyek. Jangan
> mengubah konfigurasi repo hanya untuk mesin yang terkena blokir.

---

## 1. `npm install -g pnpm` gagal di Windows

Gejala:

```text
'"...\node_modules\pnpm\pnpm"' is not recognized
```

Penyebab: postinstall pnpm diblokir kebijakan npm. Perbaikan:

```powershell
npm config set allow-scripts=pnpm --location=user
npm rebuild -g pnpm --allow-scripts=pnpm
pnpm -v
```

Shim `pnpm.cmd` yang benar menunjuk ke `node_modules\pnpm\pnpm.exe`.

---

## 2. Tarball timeout karena proxy

Gejala: registry terbuka di browser, tetapi `pnpm install` timeout pada satu
tarball.

Unduh tarball yang gagal, masukkan ke store, lalu ulangi instalasi offline
terlebih dahulu:

```powershell
pnpm store add "D:\Users\<user>\Downloads\common-22.3.0.tgz" --store-dir "D:\.pnpm-store"
pnpm install --prefer-offline
```

Versi tarball **wajib** sama dengan yang diminta lockfile. Contoh di atas untuk
`@angular/common@22.3.0`; ganti sesuai paket yang gagal di log.

---

## 3. `ERR_PNPM_IGNORED_BUILDS`

Gejala: instalasi berhenti karena build script paket tidak disetujui.

Repo memakai `ignore-scripts=true`; build script yang diperlukan disetujui
eksplisit di `pnpm-workspace.yaml` (`allowBuilds`). Untuk esbuild:

```powershell
pnpm approve-builds esbuild
pnpm install
```

Bila memakai pnpm versi lain, perintah di atas tersedia sejak pnpm 10; pada
versi lebih lama tambahkan entri `allowBuilds` secara manual.

---

## 4. Browser Playwright tidak terpasang

Test browser/E2E membutuhkan browser Playwright:

```bash
pnpm exec playwright install chromium firefox webkit
```

Di lingkungan yang melarang penulisan ke direktori home, arahkan ke dalam
workspace:

```bash
PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers pnpm exec playwright install chromium
```

Direktori itu sudah di-ignore Git sehingga tidak masuk riwayat.
