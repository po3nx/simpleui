import '../../../datagrid/src/styles/grid.css';
import {
  describeGridParity,
  type GridHarness,
  type ParityOptions,
} from '@simpleui/testing/grid-parity';
import {
  createDataGrid,
  type VanillaDataGrid,
  type VanillaDataGridOptions,
} from '../../src/index.js';

const toOptions = (options: ParityOptions): VanillaDataGridOptions =>
  options as unknown as VanillaDataGridOptions;

describeGridParity('vanilla', (container): GridHarness => {
  let grid: VanillaDataGrid | undefined;
  return {
    container,
    async mount(options) {
      grid = createDataGrid(container, toOptions(options));
    },
    async update(options) {
      grid?.update(toOptions(options));
    },
    destroy() {
      grid?.destroy();
      grid = undefined;
    },
  };
});
