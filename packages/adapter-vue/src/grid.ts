import {
  defineComponent,
  Fragment,
  h,
  onMounted,
  onUnmounted,
  ref,
  render,
  watch,
  type PropType,
  type Slots,
  type VNode,
} from 'vue';
import type { Key, SortDescriptor, TemplateRenderer } from '@simpleui/core';

import {
  createFocusModel,
  createGridView,
  createGridStateStore,
  createRowRenderer,
  normalizeColumnModel,
  type ColumnOptions,
  type ColumnState,
  type GridView,
  type RowRenderer,
} from '@simpleui/datagrid';

/**
 * Adapter Vue DataGrid (DG-051): v-model untuk sort/page/selection dan slot
 * cell/header. Mount/unmount bersih, update data tanpa re-mount.
 */

type RowRecord = Record<string, unknown>;

export interface VueDataGridProps {
  readonly columns: readonly ColumnOptions<RowRecord>[];
  readonly rows: readonly RowRecord[];
  readonly keyExpr?: string | ((row: RowRecord) => Key);
  readonly rowHeight?: number;
  readonly pageIndex?: number;
  readonly pageSize?: number;
  readonly totalCount?: number;
  readonly sortBy?: readonly SortDescriptor[];
  readonly selectionMode?: 'none' | 'single' | 'multiple';
  readonly selectedKeys?: readonly Key[];
  readonly viewOptions?: Readonly<Record<string, unknown>> | undefined;
}

function keyResolver(
  keyExpr: VueDataGridProps['keyExpr'],
): (row: RowRecord) => Key {
  if (typeof keyExpr === 'function') return keyExpr;
  if (typeof keyExpr === 'string') return (row) => row[keyExpr] as Key;
  return (row) => row['id'] as Key;
}

type SlotFn = NonNullable<Slots[string]>;

function slotTemplate(slot: SlotFn): TemplateRenderer {
  return (container, context) => {
    let current = context;
    const draw = (): void => {
      const nodes = slot({
        value: current.value,
        row: current.row,
        column: current.column,
        index: current.index,
      }) as VNode[] | undefined;
      render(h(Fragment, null, nodes ?? []), container);
    };
    draw();
    return {
      update(next) {
        current = next;
        draw();
      },
      dispose() {
        render(null, container);
      },
    };
  };
}

function decorateColumns(
  columns: readonly ColumnOptions<RowRecord>[],
  slots: Slots,
): readonly ColumnOptions<RowRecord>[] {
  const cell = slots['cell']
    ? slotTemplate(slots['cell'] as SlotFn)
    : undefined;
  const header = slots['header']
    ? slotTemplate(slots['header'] as SlotFn)
    : undefined;
  if (!cell && !header) return columns;
  return columns.map((column) => ({
    ...column,
    ...(cell && !column.cellTemplate ? { cellTemplate: cell } : {}),
    ...(header && !column.headerCellTemplate
      ? { headerCellTemplate: header }
      : {}),
  }));
}

type EmitFn = (event: string, ...args: unknown[]) => void;

class VueGridController {
  readonly #host: HTMLElement;
  readonly #slots: Slots;
  readonly #emit: EmitFn;
  #props: VueDataGridProps;
  #columns: readonly ColumnState<RowRecord>[];
  #rows: readonly RowRecord[];
  #keyOf: (row: RowRecord) => Key;
  #state = createGridStateStore();
  #view: GridView<RowRecord> | undefined;
  #renderer: RowRenderer<RowRecord> | undefined;

  constructor(
    host: HTMLElement,
    props: VueDataGridProps,
    slots: Slots,
    emit: EmitFn,
  ) {
    this.#host = host;
    this.#props = { ...props };
    this.#slots = slots;
    this.#emit = emit;
    this.#columns = normalizeColumnModel(decorateColumns(props.columns, slots));
    this.#rows = props.rows;
    this.#keyOf = keyResolver(props.keyExpr);
    this.#mount();
  }

  #rendererColumns(): readonly ColumnState<RowRecord>[] {
    const selection = this.#view?.selectionColumn;
    return selection
      ? [selection as ColumnState<RowRecord>, ...this.#columns]
      : this.#columns;
  }

  #mount(): void {
    const props = this.#props;
    const keyOf = this.#keyOf;
    this.#view = createGridView<RowRecord>({
      container: this.#host,
      columns: this.#columns,
      rowCount: this.#rows.length,
      ...(props.viewOptions ?? {}),
      ...(props.rowHeight !== undefined ? { rowHeight: props.rowHeight } : {}),
      ...(props.sortBy !== undefined ? { sortBy: props.sortBy } : {}),
      pageIndex: props.pageIndex ?? 0,
      pageSize: props.pageSize ?? 20,
      totalCount: props.totalCount ?? this.#rows.length,
      pager: true,
      ...(props.selectionMode !== undefined
        ? { selectionMode: props.selectionMode }
        : {}),
      rowKey: keyOf,
      getVisibleKeys: () => this.#rows.map(keyOf),
      ...(props.selectedKeys !== undefined
        ? { selectedKeys: props.selectedKeys }
        : {}),
      onSortChange: (next) => {
        this.#emit('update:sortBy', next);
        this.#emit('sortChange', next);
        if (props.sortBy) this.#view?.setSorting(props.sortBy);
      },
      onPageChange: (state) => {
        this.#emit('update:pageIndex', state.pageIndex);
        this.#emit('update:pageSize', state.pageSize);
        this.#emit('pageChange', state);
      },
      onSelectionChange: (keys) => {
        this.#emit('update:selectedKeys', keys);
        this.#emit('selectionChange', keys);
        if (props.selectedKeys) {
          this.#view?.setSelection(props.selectedKeys);
          this.#renderer?.setRows(this.#rows);
        }
      },
    });

    const focus = createFocusModel<RowRecord>({
      state: this.#state,
      columns: this.#columns,
      getRowKeys: () => this.#rows.map(keyOf),
    });
    this.#renderer = createRowRenderer<RowRecord>({
      gridElement: this.#view.element,
      viewportElement: this.#view.viewportElement,
      spacerElement: this.#view.spacerElement,
      rowsElement: this.#view.rowsElement,
      columns: this.#rendererColumns(),
      rows: this.#rows,
      keyOf,
      ...(props.rowHeight !== undefined ? { rowHeight: props.rowHeight } : {}),
      focus,
    });
  }

  update(props: VueDataGridProps): void {
    const view = this.#view;
    if (!view) return;
    if (props.columns !== this.#props.columns) {
      this.#columns = normalizeColumnModel(
        decorateColumns(props.columns, this.#slots),
      );
      view.setColumns(this.#columns);
      this.#renderer?.setColumns(this.#rendererColumns());
    }
    if (props.rows !== this.#rows) {
      this.#rows = props.rows;
      this.#renderer?.setRows(this.#rows);
      view.setRowCount(this.#rows.length);
    }
    if (props.sortBy) view.setSorting(props.sortBy);
    if (props.selectedKeys) {
      view.setSelection(props.selectedKeys);
      this.#renderer?.setRows(this.#rows);
    }
    view.setPaging({
      pageIndex: props.pageIndex ?? 0,
      pageSize: props.pageSize ?? 20,
      totalCount: props.totalCount ?? this.#rows.length,
      itemCount: this.#rows.length,
    });
    this.#props = { ...props };
  }

  dispose(): void {
    this.#renderer?.dispose();
    this.#view?.dispose();
    this.#renderer = undefined;
    this.#view = undefined;
  }
}

export const DataGrid = defineComponent({
  name: 'SimpleUIDataGrid',
  props: {
    columns: {
      type: Array as PropType<readonly ColumnOptions<RowRecord>[]>,
      required: true,
    },
    rows: { type: Array as PropType<readonly RowRecord[]>, required: true },
    keyExpr: {
      type: [String, Function] as PropType<string | ((row: RowRecord) => Key)>,
      default: undefined,
    },
    rowHeight: { type: Number, default: undefined },
    pageIndex: { type: Number, default: undefined },
    pageSize: { type: Number, default: undefined },
    totalCount: { type: Number, default: undefined },
    sortBy: {
      type: Array as PropType<readonly SortDescriptor[]>,
      default: undefined,
    },
    selectionMode: {
      type: String as PropType<'none' | 'single' | 'multiple'>,
      default: undefined,
    },
    selectedKeys: {
      type: Array as PropType<readonly Key[]>,
      default: undefined,
    },
    viewOptions: {
      type: Object as PropType<Readonly<Record<string, unknown>>>,
      default: undefined,
    },
  },
  emits: [
    'update:sortBy',
    'update:pageIndex',
    'update:pageSize',
    'update:selectedKeys',
    'sortChange',
    'pageChange',
    'selectionChange',
  ],
  setup(props, { emit, slots }) {
    const host = ref<HTMLElement | null>(null);
    let controller: VueGridController | null = null;

    onMounted(() => {
      if (host.value) {
        controller = new VueGridController(
          host.value,
          props as VueDataGridProps,
          slots,
          emit as EmitFn,
        );
      }
    });
    onUnmounted(() => {
      controller?.dispose();
      controller = null;
    });
    watch(
      () => [
        props.columns,
        props.rows,
        props.sortBy,
        props.pageIndex,
        props.pageSize,
        props.totalCount,
        props.selectedKeys,
      ],
      () => controller?.update(props as VueDataGridProps),
    );

    return () =>
      h('div', {
        ref: host,
        class: 'simpleui-vue-grid',
        style: { height: '100%' },
      });
  },
});
