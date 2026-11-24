# Tema dan Token

Tema dipilih dengan atribut pada elemen `.sui-theme` (atau `<html>`):

- `data-theme="light" | "dark" | "high-contrast"`
- `data-density="comfortable" | "compact" | "spacious"`

Bila `data-theme` tidak diset, tema mengikuti `prefers-color-scheme`. Mode
`forced-colors` dan `prefers-reduced-motion` juga dihormati.

## Override

```css
@layer simpleui.tokens {
  .sui-theme {
    --sui-color-accent-default: #7c3aed;
  }
}
```

Karena memakai CSS layer, override tidak memerlukan `!important`.
