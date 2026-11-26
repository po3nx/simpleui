# @simpleui/vanilla

Adapter vanilla JavaScript/UMD untuk SimpleUI DataGrid.

```js
import { createDataGrid } from '@simpleui/vanilla';
import '@simpleui/datagrid/styles.css';

const grid = createDataGrid(document.querySelector('#grid'), {
  columns: [{ dataField: 'name', caption: 'Nama' }],
  rows,
  keyExpr: 'id',
  sortBy,
  onSortChange: (next) => {
    sortBy = next;
  },
});

grid.update({ columns, rows: nextRows, sortBy });
grid.destroy();
```

## UMD

`dist/simpleui-vanilla.umd.js` (global `SimpleUI`) membundel core + datagrid:

```html
<script src="https://unpkg.com/@simpleui/vanilla/dist/simpleui-vanilla.umd.js"></script>
<script>
  SimpleUI.createDataGrid(el, { columns, rows });
</script>
```

## jQuery opsional

```js
SimpleUI.registerJQueryPlugin(); // memakai window.jQuery
$('#grid').simpleuiDataGrid({ columns, rows });
$('#grid').simpleuiDataGrid({ columns, rows: next }); // update
```
