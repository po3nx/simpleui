---
'@simpleui/theme': patch
---

Perbaiki kontras `--sui-color-accent-default` pada tema terang: 4,43:1 menjadi
5,07:1 di atas `--sui-color-accent-subtle`, memenuhi WCAG AA. Contract test baru
memeriksa pasangan accent/subtle di ketiga tema.
