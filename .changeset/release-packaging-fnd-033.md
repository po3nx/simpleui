---
'@simpleui/core': patch
'@simpleui/theme': patch
'@simpleui/icons': patch
'@simpleui/datagrid': patch
'@simpleui/pivotgrid': patch
'@simpleui/charts': patch
'@simpleui/testing': patch
'@simpleui/react': patch
'@simpleui/vue': patch
'@simpleui/angular': patch
'@simpleui/vanilla': patch
---

Perbaikan artefak rilis: `LICENSE` dan `NOTICE` kini ikut terkemas di tarball,
dan `@simpleui/theme` mendapat `publishConfig.access: public` agar scoped
package tidak terpublish sebagai restricted.
