# ADR-0008 — Strategi Rilis Fixed Version Group

> **Status:** Accepted · **Tanggal:** 2026-11-23 · **Owner:** Tech Lead
> **Reviewer:** Release Manager, Adapter Engineer
> **Menggantikan:** — · **Berlaku sampai:** ditinjau saat 2.0

---

## 1. Konteks

SimpleUI terdiri dari banyak paket yang saling bergantung: core, theme, icons,
komponen, adapter, testing. Jika setiap paket dirilis independen, consumer harus
mencocokkan matriks versi yang kompleks dan risiko mismatch meningkat.

---

## 2. Keputusan

> Kami memutuskan **fixed version group** untuk seluruh paket library:
> `core`, `theme`, `icons`, komponen, adapter, dan `testing` selalu memakai
> versi yang sama.

Detail:

- Changesets mengelola versi dan changelog.
- Satu PR "Version Packages" menaikkan semua paket dalam grup.
- `peerDependencies` antar paket SimpleUI memakai versi yang sama (`workspace:*`
  saat development, rentang sama saat publish).
- Apps (`docs`, playground), contoh, dan tools **tidak** termasuk grup; mereka
  dapat dirilis kapan saja.
- Sebelum 1.0: `0.x`; breaking change tetap dicatat.
- Sejak 1.0: semver; breaking change hanya di major.
- Changelog dikelompokkan per paket tetapi berasal dari satu rilis.

---

## 3. Alternatif yang dipertimbangkan

| Alternatif           | Kelebihan                 | Kekurangan                       | Alasan tidak dipilih                   |
| -------------------- | ------------------------- | -------------------------------- | -------------------------------------- |
| Independent versions | Rilis komponen cepat      | Matriks versi rumit, mismatch    | Tidak cocok untuk library terintegrasi |
| Fixed group          | Sederhana, terjamin cocok | Patch kecil menaikkan semua      | **Dipilih**                            |
| Lockstep manual      | Kontrol penuh             | Human error                      | Ditolak                                |
| Satu paket monolitik | Paling sederhana          | Bundle besar, tree-shaking sulit | Ditolak                                |

---

## 4. Konsekuensi

### Positif

- Consumer hanya perlu satu versi.
- Kompatibilitas core/adapter/komponen terjamin.
- Changelog dan support matrix sederhana.

### Negatif / risiko

- Perbaikan kecil di satu paket menaikkan versi semua paket.
- Rilis lebih sering menyentuh banyak paket.
- Perlu disiplin changeset.

### Mitigasi

- Perubahan internal tanpa dampak consumer tetap `patch`; tidak memicu rilis
  jika tidak ada changeset.
- Changeset wajib untuk perubahan consumer-facing.
- Docs merilis terpisah.

---

## 5. Keamanan dan privasi

- Publikasi fixed group memudahkan audit: satu SBOM per rilis.
- Provenance dan signature per paket.
- Jika satu paket memiliki kerentanan, patch release berlaku untuk semua.
- Tidak ada token long-lived; trusted publishing via OIDC.

---

## 6. Kompatibilitas dan migrasi

- Semua paket dalam grup harus kompatibel pada versi yang sama.
- Consumer tidak boleh mencampur versi minor antar paket SimpleUI.
- Perubahan major berlaku untuk seluruh grup.
- Paket di luar grup (docs, contoh) tidak dijamin kompatibel.

---

## 7. Implementasi

| Item    | Detail                                       |
| ------- | -------------------------------------------- |
| Tool    | Changesets `fixed` group                     |
| CI      | `changeset status` + version PR              |
| Publish | urut core → theme/icons → komponen → adapter |
| SBOM    | per rilis                                    |
| Target  | FND-008, FND-033                             |

---

## 8. Referensi

- [Build & Release §6](../07-build-release.md#6-versioning-dan-changesets)
- [Rule Umum §5.3](../00-rule-umum.md#53-semver-dan-deprecation)
- [Master backlog](../10-tracking/master-backlog.md)

---

## Catatan review

| Tanggal    | Reviewer         | Keputusan | Catatan                 |
| ---------- | ---------------- | --------- | ----------------------- |
| 2026-11-23 | Tech Lead        | Setuju    | Fixed group             |
| 2026-11-23 | Release Manager  | Setuju    | Changesets + provenance |
| 2026-11-23 | Adapter Engineer | Setuju    | Peer range sama         |
