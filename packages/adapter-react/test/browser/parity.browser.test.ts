import '../../../theme/src/index.css';
import '../../../datagrid/src/styles/grid.css';
import { act, createElement, StrictMode, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  describeGridParity,
  type GridHarness,
  type ParityOptions,
} from '@simpleui/testing/grid-parity';
import { DataGrid, type DataGridProps } from '../../src/index.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const toProps = (
  options: ParityOptions,
): DataGridProps<Record<string, unknown>> =>
  options as unknown as DataGridProps<Record<string, unknown>>;

describeGridParity('React', (container): GridHarness => {
  let root: Root | undefined;
  const render = async (options: ParityOptions): Promise<void> => {
    const element: ReactElement = createElement(
      StrictMode,
      null,
      createElement(DataGrid, toProps(options)),
    );
    await act(async () => {
      root?.render(element);
    });
  };
  return {
    container,
    async mount(options) {
      root = createRoot(container);
      await render(options);
    },
    async update(options) {
      await render(options);
    },
    destroy() {
      if (root) {
        act(() => root?.unmount());
        root = undefined;
      }
    },
  };
});
