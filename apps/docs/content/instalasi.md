# Instalasi

```bash
pnpm add @simpleui/core @simpleui/theme
```

Prasyarat: Node.js 24+ dan pnpm 12+.

## Tema

```ts
import '@simpleui/theme/styles.css';
```

## Pemakaian dasar

```ts
import { createElement, Virtualizer } from '@simpleui/core';

const list = createElement('div', { className: 'sui-theme' });
```

Api publik stabil mengikuti semver; lihat perubahan pada catatan rilis setiap
paket.
