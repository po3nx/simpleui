/**
 * Anggaran ukuran bundle (FND-030, docs/00-rule-umum.md §8.1).
 *
 * Diukur dari berkas `dist` hasil build (gzip), tanpa bundling ulang, agar
 * angka yang dijaga sama dengan yang diterima consumer.
 */
export default [
  {
    name: '@simpleui/core',
    path: 'packages/core/dist/index.js',
    limit: '25 kB',
    gzip: true,
  },
  {
    name: '@simpleui/testing',
    path: 'packages/testing/dist/index.js',
    limit: '10 kB',
    gzip: true,
  },
  {
    name: '@simpleui/testing/adapter',
    path: 'packages/testing/dist/adapter.js',
    limit: '10 kB',
    gzip: true,
  },
  {
    name: '@simpleui/theme (CSS)',
    path: 'packages/theme/dist/index.css',
    limit: '30 kB',
    gzip: true,
  },
  {
    name: '@simpleui/icons',
    path: 'packages/icons/dist/index.js',
    limit: '15 kB',
    gzip: true,
  },
  {
    name: '@simpleui/datagrid',
    path: 'packages/datagrid/dist/index.js',
    limit: '70 kB',
    gzip: true,
  },
  {
    name: '@simpleui/pivotgrid',
    path: 'packages/pivotgrid/dist/index.js',
    limit: '50 kB',
    gzip: true,
  },
  {
    name: '@simpleui/charts',
    path: 'packages/charts/dist/index.js',
    limit: '90 kB',
    gzip: true,
  },
  {
    name: '@simpleui/react',
    path: 'packages/adapter-react/dist/index.js',
    limit: '5 kB',
    gzip: true,
  },
  {
    name: '@simpleui/vue',
    path: 'packages/adapter-vue/dist/index.js',
    limit: '5 kB',
    gzip: true,
  },
  {
    name: '@simpleui/angular',
    path: 'packages/adapter-angular/dist/index.js',
    limit: '5 kB',
    gzip: true,
  },
  {
    name: '@simpleui/vanilla',
    path: 'packages/adapter-vanilla/dist/index.js',
    limit: '5 kB',
    gzip: true,
  },
];
