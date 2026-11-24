# Aksesibilitas

Target: **WCAG 2.2 Level AA**.

- Semua fungsi dapat dioperasikan dengan keyboard; fokus terlihat jelas.
- `RovingTabindex` untuk pola grid/listbox, `FocusTrap` untuk dialog.
- Status dinamis diumumkan lewat `Announcer` yang di-throttle.
- Kontras teks default dan tema gelap ≥ 4,5:1; tema kontras tinggi ≥ 7:1.

## Contoh

```ts
import { Announcer, RovingTabindex } from '@simpleui/core';

const announcer = new Announcer({ throttleMs: 150 });
announcer.announce('3 baris dipilih');
```
