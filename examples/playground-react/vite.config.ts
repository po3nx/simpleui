import { defineConfig } from 'vite';

// base relatif agar artefak dapat disajikan dari subpath mana pun.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', target: 'es2022' },
});
