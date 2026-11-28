import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgZone,
  Output,
  ViewChild,
  inject,
  type AfterViewInit,
  type ElementRef,
  type OnChanges,
  type OnDestroy,
} from '@angular/core';
import type { Key, SortDescriptor } from '@simpleui/core';
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
  type EditingUiOptions,
  type SummaryItem,
  type MasterDetailOptions,
  type GroupNode,
} from '@simpleui/datagrid';

/**
 * Adapter Angular DataGrid (DG-052): standalone, OnPush, zoneless-friendly,
 * SSR guard, dan output controlled untuk sort/page/selection.
 */

type RowRecord = Record<string, unknown>;

export function isBrowserEnvironment(): boolean {
  return typeof document !== 'undefined';
}

function keyResolver(
  keyExpr: string | ((row: RowRecord) => Key) | undefined,
): (row: RowRecord) => Key {
  if (typeof keyExpr === 'function') return keyExpr;
  if (typeof keyExpr === 'string') return (row) => row[keyExpr] as Key;
  return (row) => row['id'] as Key;
}

interface GridInputs {
  readonly columns: readonly ColumnOptions<RowRecord>[];
  readonly rows: readonly RowRecord[];
  readonly keyExpr?: string | ((row: RowRecord) => Key) | undefined;
  readonly rowHeight?: number | undefined;
  readonly pageIndex?: number | undefined;
  readonly pageSize?: number | undefined;
  readonly totalCount?: number | undefined;
  readonly sortBy?: readonly SortDescriptor[] | undefined;
  readonly selectionMode?: 'none' | 'single' | 'multiple' | undefined;
  readonly selectedKeys?: readonly Key[] | undefined;
  readonly onSearchChange?: ((query: string) => void) | undefined;
  readonly viewOptions?: Readonly<Record<string, unknown>> | undefined;
  readonly rtl?: boolean | undefined;
  readonly editing?: EditingUiOptions<RowRecord> | undefined;
  readonly groupBy?: readonly string[] | undefined;
  readonly rowTemplate?:
    | ((
        container: HTMLElement,
        context: { row: RowRecord; key: Key; index: number },
      ) => void)
    | undefined;
  readonly groupTemplate?:
    | ((
        container: HTMLElement,
        context: { node: GroupNode<RowRecord>; expanded: boolean },
      ) => void)
    | undefined;
  readonly masterDetail?: MasterDetailOptions<RowRecord> | undefined;
  readonly groupSummaryItems?: readonly SummaryItem<RowRecord>[] | undefined;
  readonly expandedGroups?: readonly string[] | undefined;
  readonly onGroupToggle?:
    ((groupKey: string, expanded: boolean) => void) | undefined;
  readonly locale?: string | undefined;
  readonly status?:
    'loading' | 'empty' | 'no-data' | 'error' | null | undefined;
  readonly statusMessage?: string | undefined;
}

interface GridEmit {
  readonly sortBy: (sortBy: readonly SortDescriptor[]) => void;
  readonly page: (pageIndex: number, pageSize: number) => void;
  readonly selection: (keys: readonly Key[]) => void;
}

function syncLocale(
  next: string | undefined,
  previous: string | undefined,
  renderer: { setLocale(locale: string | undefined): void } | undefined,
): void {
  if (next !== previous) renderer?.setLocale(next);
}

function syncStatus(
  next: string | null | undefined,
  previous: string | null | undefined,
  apply: () => void,
): void {
  if (next !== previous) apply();
}

class AngularGridController {
  readonly #host: HTMLElement;
  #inputs: GridInputs;
  readonly #emit: GridEmit;
  #columns: readonly ColumnState<RowRecord>[];
  #rows: readonly RowRecord[];
  #keyOf: (row: RowRecord) => Key;
  #state = createGridStateStore();
  #view: GridView<RowRecord> | undefined;
  #renderer: RowRenderer<RowRecord> | undefined;

  constructor(host: HTMLElement, inputs: GridInputs, emit: GridEmit) {
    this.#host = host;
    this.#inputs = inputs;
    this.#emit = emit;
    this.#columns = normalizeColumnModel(inputs.columns);
    this.#rows = inputs.rows;
    this.#keyOf = keyResolver(inputs.keyExpr);
    this.#mount();
    this.#applyStatus();
  }

  #rendererColumns(): readonly ColumnState<RowRecord>[] {
    const selection = this.#view?.selectionColumn;
    return selection
      ? [selection as ColumnState<RowRecord>, ...this.#columns]
      : this.#columns;
  }

  #mount(): void {
    const inputs = this.#inputs;
    const keyOf = this.#keyOf;
    this.#view = createGridView<RowRecord>({
      container: this.#host,
      columns: this.#columns,
      rowCount: this.#rows.length,
      rtl: inputs.rtl === true,
      ...(inputs.viewOptions ?? {}),
      ...(inputs.rowHeight !== undefined
        ? { rowHeight: inputs.rowHeight }
        : {}),
      ...(inputs.sortBy !== undefined ? { sortBy: inputs.sortBy } : {}),
      pageIndex: inputs.pageIndex ?? 0,
      pageSize: inputs.pageSize ?? 20,
      totalCount: inputs.totalCount ?? this.#rows.length,
      pager: true,
      ...(inputs.selectionMode !== undefined
        ? { selectionMode: inputs.selectionMode }
        : {}),
      rowKey: keyOf,
      getVisibleKeys: () => this.#rows.map(keyOf),
      ...(inputs.selectedKeys !== undefined
        ? { selectedKeys: inputs.selectedKeys }
        : {}),
      onSortChange: (next) => {
        this.#emit.sortBy(next);
        if (inputs.sortBy) this.#view?.setSorting(inputs.sortBy);
      },
      onPageChange: (state) => this.#emit.page(state.pageIndex, state.pageSize),
      ...(this.#inputs.onSearchChange !== undefined
        ? {
            onSearchChange: (query: string) =>
              this.#inputs.onSearchChange?.(query),
          }
        : {}),
      onSelectionChange: (keys) => {
        this.#emit.selection(keys);
        if (inputs.selectedKeys) {
          this.#view?.setSelection(inputs.selectedKeys);
          this.#renderer?.setRows(this.#rows);
        }
      },
    });
    this.#renderer = this.#createRenderer(keyOf);
  }

  #createRenderer(keyOf: (row: RowRecord) => Key): RowRenderer<RowRecord> {
    const view = this.#view;
    if (!view) throw new Error('view belum dibuat');
    const focus = createFocusModel<RowRecord>({
      state: this.#state,
      columns: this.#columns,
      getRowKeys: () => this.#rows.map(keyOf),
    });
    return createRowRenderer<RowRecord>({
      gridElement: view.element,
      viewportElement: view.viewportElement,
      spacerElement: view.spacerElement,
      rowsElement: view.rowsElement,
      columns: this.#rendererColumns(),
      rows: this.#rows,
      keyOf,
      ...(this.#inputs.rowHeight !== undefined
        ? { rowHeight: this.#inputs.rowHeight }
        : {}),
      isSelected: (row) => view.isSelectedKey(keyOf(row)) ?? false,
      selectionChanges: (listener) =>
        view.subscribeSelection(listener) ?? (() => {}),
      focus,
      liveElement: view.liveElement,
      rtl: this.#inputs.rtl === true,
      ...(this.#inputs.editing ? { editing: this.#inputs.editing } : {}),
      ...(this.#inputs.groupBy ? { groupBy: this.#inputs.groupBy } : {}),
      ...(this.#inputs.expandedGroups
        ? { expandedGroups: this.#inputs.expandedGroups }
        : {}),
      ...(this.#inputs.onGroupToggle
        ? { onGroupToggle: this.#inputs.onGroupToggle }
        : {}),
    });
  }

  #applyStatus(): void {
    this.#view?.setStatus(this.#inputs.status ?? null, {
      ...(this.#inputs.statusMessage !== undefined
        ? { message: this.#inputs.statusMessage }
        : {}),
      retryable: false,
    });
  }

  update(inputs: GridInputs): void {
    const view = this.#view;
    if (!view) return;
    if (inputs.columns !== this.#inputs.columns) {
      this.#columns = normalizeColumnModel(inputs.columns);
      view.setColumns(this.#columns);
      this.#renderer?.setColumns(this.#rendererColumns());
    }
    if (inputs.rows !== this.#rows) {
      this.#rows = inputs.rows;
      this.#renderer?.setRows(this.#rows);
      view.setRowCount(this.#rows.length);
    }
    if (inputs.sortBy) view.setSorting(inputs.sortBy);
    if (inputs.selectedKeys) {
      view.setSelection(inputs.selectedKeys);
      this.#renderer?.setRows(this.#rows);
    }
    view.setPaging({
      pageIndex: inputs.pageIndex ?? 0,
      pageSize: inputs.pageSize ?? 20,
      totalCount: inputs.totalCount ?? this.#rows.length,
      itemCount: this.#rows.length,
    });
    const previous = this.#inputs;
    this.#inputs = inputs;
    syncLocale(inputs.locale, previous.locale, this.#renderer);
    syncStatus(inputs.status, previous.status, () => this.#applyStatus());
  }

  dispose(): void {
    this.#renderer?.dispose();
    this.#view?.dispose();
    this.#renderer = undefined;
    this.#view = undefined;
  }
}

@Component({
  selector: 'sui-data-grid',
  standalone: true,
  template:
    '<div #host class="simpleui-angular-grid" style="height: 100%"></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataGridComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) columns!: readonly ColumnOptions<RowRecord>[];
  @Input({ required: true }) rows!: readonly RowRecord[];
  @Input() keyExpr: string | ((row: RowRecord) => Key) | undefined;
  @Input() rowHeight: number | undefined;
  @Input() pageIndex: number | undefined;
  @Input() pageSize: number | undefined;
  @Input() totalCount: number | undefined;
  @Input() sortBy: readonly SortDescriptor[] | undefined;
  @Input() selectionMode: 'none' | 'single' | 'multiple' | undefined;
  @Input() selectedKeys: readonly Key[] | undefined;
  @Input() onSearchChange: ((query: string) => void) | undefined;
  @Input() viewOptions: Readonly<Record<string, unknown>> | undefined;
  @Input() rtl = false;
  @Input() editing: EditingUiOptions<RowRecord> | undefined;
  @Input() groupBy: readonly string[] | undefined;
  @Input() groupSummaryItems: readonly SummaryItem<RowRecord>[] | undefined;
  @Input() masterDetail: MasterDetailOptions<RowRecord> | undefined;
  @Input() rowTemplate:
    | ((
        container: HTMLElement,
        context: { row: RowRecord; key: Key; index: number },
      ) => void)
    | undefined;
  @Input() groupTemplate:
    | ((
        container: HTMLElement,
        context: { node: GroupNode<RowRecord>; expanded: boolean },
      ) => void)
    | undefined;
  @Input() expandedGroups: readonly string[] | undefined;
  @Input() onGroupToggle:
    ((groupKey: string, expanded: boolean) => void) | undefined;
  @Input() locale: string | undefined;
  @Input() status: 'loading' | 'empty' | 'no-data' | 'error' | null | undefined;
  @Input() statusMessage: string | undefined;

  @Output() readonly sortByChange = new EventEmitter<
    readonly SortDescriptor[]
  >();
  @Output() readonly pageChange = new EventEmitter<{
    pageIndex: number;
    pageSize: number;
  }>();
  @Output() readonly selectedKeysChange = new EventEmitter<readonly Key[]>();

  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLElement>;

  readonly #zone = inject(NgZone, { optional: true });
  #controller: AngularGridController | null = null;

  #inputs(): GridInputs {
    return {
      columns: this.columns,
      rows: this.rows,
      keyExpr: this.keyExpr,
      rowHeight: this.rowHeight,
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      totalCount: this.totalCount,
      sortBy: this.sortBy,
      selectionMode: this.selectionMode,
      selectedKeys: this.selectedKeys,
      onSearchChange: this.onSearchChange,
      viewOptions: this.viewOptions,
      rtl: this.rtl,
      editing: this.editing,
      groupBy: this.groupBy,
      groupSummaryItems: this.groupSummaryItems,
      masterDetail: this.masterDetail,
      rowTemplate: this.rowTemplate,
      groupTemplate: this.groupTemplate,
      expandedGroups: this.expandedGroups,
      onGroupToggle: this.onGroupToggle,
      locale: this.locale,
      status: this.status,
      statusMessage: this.statusMessage,
    };
  }

  ngAfterViewInit(): void {
    if (!isBrowserEnvironment()) return;
    const create = (): void => {
      this.#controller = new AngularGridController(
        this.hostRef.nativeElement,
        this.#inputs(),
        {
          sortBy: (next) => this.sortByChange.emit(next),
          page: (pageIndex, pageSize) =>
            this.pageChange.emit({ pageIndex, pageSize }),
          selection: (keys) => this.selectedKeysChange.emit(keys),
        },
      );
    };
    if (this.#zone) this.#zone.runOutsideAngular(create);
    else create();
  }

  ngOnChanges(): void {
    this.#controller?.update(this.#inputs());
  }

  ngOnDestroy(): void {
    this.#controller?.dispose();
    this.#controller = null;
  }
}
