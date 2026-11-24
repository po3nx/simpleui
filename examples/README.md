# Playground

Aplikasi contoh untuk membuktikan adapter bekerja di aplikasi Vite nyata.
Setiap playground me-mount bridge, memperbarui daftar, lalu unmount/remount.

| Playground                               | Bridge                | Paket               |
| ---------------------------------------- | --------------------- | ------------------- |
| [playground-react](playground-react)     | `createReactBridge`   | `@simpleui/react`   |
| [playground-vue](playground-vue)         | `createVueBridge`     | `@simpleui/vue`     |
| [playground-vanilla](playground-vanilla) | `createVanillaBridge` | `@simpleui/vanilla` |

```bash
pnpm --filter @simpleui/playground-react dev
pnpm build            # semua playground ikut dibangun
pnpm test:e2e         # E2E memeriksa mount/update/unmount
```

Playground Angular belum ada; menunggu spike adapter Angular (FND-028).
