import { createApp, defineComponent, h, nextTick, reactive } from 'vue';
import {
  describeGridParity,
  type GridHarness,
  type ParityOptions,
} from '@simpleui/testing/grid-parity';
import { DataGrid } from '../../src/index.js';

function toProps(options: ParityOptions) {
  return {
    columns: options.columns,
    rows: options.rows,
    keyExpr: options.keyExpr,
    sortBy: options.sortBy,
    selectedKeys: options.selectedKeys,
    pageIndex: options.pageIndex,
    pageSize: options.pageSize,
    totalCount: options.totalCount,
    selectionMode: options.selectionMode,
    onSortChange: options.onSortChange,
    onSelectionChange: options.onSelectionChange,
    onPageChange: options.onPageChange,
  };
}

describeGridParity('Vue', (container): GridHarness => {
  const state = reactive<{ options: ParityOptions }>({
    options: { columns: [], rows: [] },
  });
  let app: ReturnType<typeof createApp> | undefined;

  return {
    container,
    async mount(options) {
      state.options = options;
      app = createApp(
        defineComponent({
          setup() {
            return () => h(DataGrid, toProps(state.options));
          },
        }),
      );
      app.mount(container);
      await nextTick();
    },
    async update(options) {
      state.options = options;
      await nextTick();
    },
    destroy() {
      app?.unmount();
      app = undefined;
    },
  };
});
