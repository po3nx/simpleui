# Security Policy

## Supported versions

SimpleUI is pre-1.0. Security fixes are applied to the latest published
`0.x` line until `1.0` is released. After `1.0`, the latest major and the
previous major receive security patches for six months.

| Version        | Supported |
| -------------- | --------- |
| `0.x` (latest) | Yes       |
| older `0.x`    | No        |

## Reporting a vulnerability

**Do not open a public issue.**

Use GitHub's private vulnerability reporting:

1. Buka tab **Security** di repository.
2. Pilih **Advisories** → **Report a vulnerability**.
3. Sertakan versi paket, langkah reproduksi, dan dampak.

Jika private reporting belum tersedia, hubungi maintainer secara privat melalui
kanal yang tercantum di profil organisasi/repository.

Kami akan:

- mengonfirmasi laporan dalam **3 hari kerja**;
- memberikan triage awal dan rencana perbaikan;
- merilis patch untuk versi yang didukung;
- mengoordinasikan disclosure setelah patch tersedia (target 90 hari).

## Scope

Termasuk:

- `@simpleui/core`, komponen, adapter, dan paket publik lain;
- rendering/template, export, clipboard, state persistence;
- build/publish pipeline dan dependency runtime.

Tidak termasuk:

- aplikasi consumer, server, atau konfigurasi otorisasi mereka;
- kerentanan pada dependency yang belum memiliki patch (akan dilacak, tetapi
  bukan celah SimpleUI);
- serangan yang membutuhkan akses fisik/root.

## Dependency security

- `pnpm audit` berjalan di CI untuk setiap PR dan setiap minggu.
- Gate: **high/critical** menggagalkan build; laporan lengkap diunggah sebagai
  artifact.
- Dependabot membuka PR update dependency setiap minggu.
- Lockfile committed; `ignore-scripts=true`; build script hanya yang tercatat
  di `allowBuilds` (saat ini `esbuild`).
- Dependency runtime wajib lolos license allowlist dan review keamanan.
- Tidak ada telemetry atau request pihak ketiga dari library.

## Supply chain

- **Lockfile** di-commit; CI memakai `pnpm install --frozen-lockfile`, sehingga
  dependency tidak dapat berubah tanpa perubahan lockfile yang di-review.
- **Script instalasi** dibatasi: `.npmrc` memakai `ignore-scripts=true`; build
  script yang diizinkan hanya tercatat di `allowBuilds` (`esbuild`).
- **Lisensi dependency** divalidasi `pnpm check:license` terhadap allowlist
  (MIT, Apache-2.0, BSD-2/3, ISC, 0BSD) — lihat `pnpm check:license`.
- **Audit** high/critical menjadi gate PR dan berjalan mingguan
  (`.github/workflows/security.yml`).
- **SBOM** CycloneDX dibuat dengan `pnpm sbom:generate` dan diunggah sebagai
  artifact CI pada setiap PR, push ke `main`, dan jadwal mingguan.
- **Provenance**: paket akan dipublikasikan dengan `--provenance` dan OIDC
  trusted publishing; token npm berumur panjang **dilarang** di repository.
- **Versi toolchain** dikunci (`packageManager`, `.nvmrc`) agar build dapat
  direproduksi.

## Disclosure policy

- Patch dirilis lebih dulu, lalu advisory.
- Kredit reporter diberikan bila diinginkan.
- Tidak ada bug bounty pada tahap pre-1.0.

## Security releases

Patch keamanan dapat dirilis di luar jadwal normal. Changelog akan menyebut
tingkat keparahan, paket terdampak, dan langkah mitigasi.
