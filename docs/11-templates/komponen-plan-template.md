# Template Plan Komponen

> **Cara pakai:** salin file ini ke
> `docs/components/<nama>/README.md`, ganti placeholder, lalu buat
> `docs/components/<nama>/02-tasks.md` (atau `07-tasks.md` mengikuti DataGrid).
> Jangan mengubah struktur tabel task tanpa memperbarui
> `docs/10-tracking/tools/progress.mjs`.

---

# <Nama Komponen> — Plan Komponen

> **Status:** Planned · **Target:** <versi/milestone> · **Paket:**
> `@simpleui/<nama>` + adapter
> **Owner:** <squad> · **Tech lead:** <nama> · **Security reviewer:** <nama>

## 1. Ringkasan

- **Masalah yang diselesaikan:** <2–3 kalimat>
- **Pengguna utama:** <persona>
- **Mengapa sekarang:** <alasan prioritas>
- **Diferensiasi:** <3–5 poin>

## 2. Scope

### 2.1 P0 — MVP

| Fitur   | Acceptance criteria |
| ------- | ------------------- |
| <fitur> | <kriteria terukur>  |

### 2.2 P1 — GA 1.0

| Fitur   | Acceptance criteria |
| ------- | ------------------- |
| <fitur> | <kriteria terukur>  |

### 2.3 P2 — Pasca-GA

- <fitur>

## 3. Non-goals (1.0)

- <hal yang tidak dibangun>

## 4. Model & arsitektur

```text
<diagram singkat>
```

- Modul:
- State:
- Alur data:
- Extension points:

## 5. API ringkas

```ts
((interface < Nama) > Options < T) >
  {
    // ...
  };
```

- Method:
- Event:
- Template:
- Error code:

## 6. Keamanan

| Ancaman      | Kontrol                        |
| ------------ | ------------------------------ |
| XSS          | Teks default; sanitizer opt-in |
| Injection    | <kontrol>                      |
| DoS          | <batas>                        |
| Supply chain | <kontrol>                      |

## 7. Aksesibilitas

- Role/ARIA:
- Keyboard:
- Live region:
- Alternatif data:
- Manual test:

## 8. Test plan

| Area        | Test           |
| ----------- | -------------- |
| Model       | <unit>         |
| DOM         | <browser>      |
| Adapter     | <parity>       |
| A11y        | <axe + manual> |
| Security    | <payload>      |
| Performance | <budget>       |

## 9. Implementasi

| Fase  | Durasi     | Fokus           | Gate   |
| ----- | ---------- | --------------- | ------ |
| <X-0> | <2 minggu> | Kontrak & spike | <gate> |
| <X-1> | <…>        | Model/data      | <gate> |
| <X-2> | <…>        | Rendering       | <gate> |
| <X-3> | <…>        | Fitur           | <gate> |
| <X-4> | <…>        | Adapter & a11y  | <gate> |
| <X-5> | <…>        | Hardening & GA  | <gate> |

## 10. Risiko

| Risiko   | Dampak   | Mitigasi   |
| -------- | -------- | ---------- |
| <risiko> | <dampak> | <mitigasi> |

## 11. Metrik keberhasilan

| Metrik            | Target |
| ----------------- | ------ |
| Time to first use | <…>    |
| Bundle gzip       | <…>    |
| Performance       | <…>    |
| Axe serious       | 0      |
| Security critical | 0      |

## 12. Dependensi

| Dependensi   | Status   | Dampak   |
| ------------ | -------- | -------- |
| <paket/task> | <status> | <dampak> |

## 13. Dokumen

- Task list: `02-tasks.md`
- Arsitektur umum: `../../01-arsitektur.md`
- Security: `../../05-security.md`
- Testing: `../../04-testing-strategy.md`
