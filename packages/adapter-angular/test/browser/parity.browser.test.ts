import '../../../datagrid/src/styles/grid.css';
import '@angular/compiler';
import {
  ApplicationRef,
  createComponent,
  provideZonelessChangeDetection,
  type ComponentRef,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import {
  describeGridParity,
  type GridHarness,
  type ParityOptions,
} from '@simpleui/testing/grid-parity';
import { DataGridComponent } from '../../src/index.js';

function inputs(options: ParityOptions): Record<string, unknown> {
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
    viewOptions: options.viewOptions,
  };
}

describeGridParity('Angular', (container): GridHarness => {
  let app: Awaited<ReturnType<typeof createApplication>> | undefined;
  let appRef: ApplicationRef | undefined;
  let ref: ComponentRef<DataGridComponent> | undefined;

  const apply = (options: ParityOptions): void => {
    if (!ref) return;
    for (const [key, value] of Object.entries(inputs(options))) {
      ref.setInput(key, value);
    }
    ref.changeDetectorRef.detectChanges();
  };

  return {
    container,
    async mount(options) {
      app = await createApplication({
        providers: [provideZonelessChangeDetection()],
      });
      appRef = app.injector.get(ApplicationRef);
      ref = createComponent(DataGridComponent, {
        environmentInjector: app.injector,
        hostElement: container,
      });
      appRef.attachView(ref.hostView);
      if (options.onSortChange) {
        ref.instance.sortByChange.subscribe(options.onSortChange);
      }
      if (options.onSelectionChange) {
        ref.instance.selectedKeysChange.subscribe(options.onSelectionChange);
      }
      if (options.onPageChange) {
        ref.instance.pageChange.subscribe(options.onPageChange);
      }
      apply(options);
    },
    async update(options) {
      apply(options);
    },
    destroy() {
      ref?.destroy();
      if (ref && appRef) appRef.detachView(ref.hostView);
      app?.destroy();
      app = undefined;
      appRef = undefined;
      ref = undefined;
    },
  };
});
