import type {
  DataStore,
  FilterExpression,
  Key,
  KeyExpr,
  SortDescriptor,
  TemplateRenderer,
} from '@simpleui/core';

/**
 * Tipe publik DataGrid (DG-002). Kontrak di dokumen 03-api.md; semua nama
 * opsi/event identik di JavaScript, TypeScript, React, Vue, dan Angular.
 */

export type DataGridErrorCode =
  | 'SUI-DG-001'
  | 'SUI-DG-002'
  | 'SUI-DG-003'
  | 'SUI-DG-004'
  | 'SUI-DG-005'
  | 'SUI-DG-006'
  | 'SUI-DG-007'
  | 'SUI-DG-008'
  | 'SUI-DG-009'
  | 'SUI-DG-010';

export type DataSourceInput<T> = readonly T[] | DataStore<T>;

export interface VisibleRow<T> {
  readonly key: Key;
  readonly data: T;
  readonly rowIndex: number;
  readonly isGroup?: boolean;
}

export type ColumnDataType =
  'string' | 'number' | 'date' | 'boolean' | 'currency';

export type ColumnAlignment = 'start' | 'center' | 'end';

export interface ColumnFormat {
  readonly type?: 'currency' | 'percent' | 'decimal' | 'date';
  readonly precision?: number;
  readonly currency?: string;
  readonly dateStyle?: 'short' | 'medium' | 'long';
}

export interface ColumnOptions<T = unknown> {
  readonly id?: string;
  readonly dataField?:
    Extract<keyof T, string> | (string & Record<never, never>);
  readonly caption?: string;
  readonly dataType?: ColumnDataType;
  readonly width?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly alignment?: ColumnAlignment;
  readonly visible?: boolean;
  readonly format?: ColumnFormat;
  readonly allowSorting?: boolean;
  readonly allowFiltering?: boolean;
  readonly allowEditing?: boolean;
  readonly allowResizing?: boolean;
  readonly allowReordering?: boolean;
  readonly allowHiding?: boolean;
  readonly fixed?: 'start' | 'end' | boolean;
  readonly columns?: readonly ColumnOptions<T>[];
  readonly calculateCellValue?: (row: T) => unknown;
  readonly cellTemplate?: TemplateRenderer;
  readonly headerCellTemplate?: TemplateRenderer;
}

export interface SortingOptions {
  readonly mode?: 'single' | 'multiple';
  readonly sortBy?: readonly SortDescriptor[];
}

export interface SearchOptions {
  readonly enabled?: boolean;
  readonly fields?: readonly string[];
  readonly debounceMs?: number;
}

export interface FilteringOptions {
  readonly filterValue?: FilterExpression | null;
  readonly filterRow?: boolean;
  readonly headerFilter?: boolean;
  readonly search?: SearchOptions;
}

export interface PagingOptions {
  readonly enabled?: boolean;
  readonly pageIndex?: number;
  readonly pageSize?: number;
  readonly pageSizes?: readonly number[];
}

export interface ScrollingOptions {
  readonly mode?: 'virtual' | 'standard';
  readonly rowHeight?: number;
  readonly overscan?: number;
  readonly columnRenderingMode?: 'virtual' | 'standard';
}

export type SelectionMode = 'none' | 'single' | 'multiple';

export interface SelectionOptions {
  readonly mode?: SelectionMode;
  readonly showCheckBoxes?: boolean;
  readonly selectedRowKeys?: readonly Key[];
  readonly selectAllMode?: 'page' | 'allPages';
  readonly preserveOnReload?: boolean;
}

export type EditingMode = 'none' | 'row' | 'cell' | 'batch' | 'form';

export interface EditingOptions {
  readonly mode?: EditingMode;
  readonly allowAdding?: boolean;
  readonly allowDeleting?: boolean;
  readonly allowUpdating?: boolean;
  readonly commitOnBlur?: boolean;
  readonly confirmDelete?: boolean;
}

export interface GroupingOptions {
  readonly groupBy?: readonly string[];
  readonly autoExpandAll?: boolean;
  readonly maxGroupCount?: number;
}

export type SummaryType = 'sum' | 'avg' | 'min' | 'max' | 'count';

export interface SummaryItem<T = unknown> {
  readonly column: string;
  readonly summaryType: SummaryType;
  readonly displayFormat?: string;
  readonly customizeText?: (item: {
    readonly value: unknown;
    readonly data: readonly T[];
  }) => string;
}

export interface SummaryOptions<T = unknown> {
  readonly totalItems?: readonly SummaryItem<T>[];
  readonly groupItems?: readonly SummaryItem<T>[];
}

export interface StateStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StateStoringOptions {
  readonly enabled?: boolean;
  readonly storageKey?: string;
  readonly storage?: StateStorage;
  readonly savingTimeout?: number;
}

export interface ExportOptions {
  readonly allowExportSelectedData?: boolean;
  readonly excludeHiddenColumns?: boolean;
  readonly fileName?: string;
}

export interface DataGridStateSnapshot {
  readonly version: number;
  readonly sortBy?: readonly SortDescriptor[];
  readonly filterValue?: FilterExpression | null;
  readonly pageIndex?: number;
  readonly pageSize?: number;
  readonly columnWidths?: Readonly<Record<string, number>>;
  readonly columnOrder?: readonly string[];
  readonly hiddenColumns?: readonly string[];
  readonly groupBy?: readonly string[];
}

export interface ContentReadyEvent {
  readonly element: HTMLElement;
}

export interface DataLoadingEvent {
  readonly loadOptions: {
    readonly skip: number;
    readonly take: number;
  };
}

export interface DataLoadedEvent<T> {
  readonly data: readonly T[];
  readonly totalCount: number;
}

export interface DataErrorEvent {
  readonly error: unknown;
}

export interface OptionChangedEvent {
  readonly name: string;
  readonly value: unknown;
  readonly previousValue: unknown;
}

export interface SortingChangedEvent {
  readonly sortBy: readonly SortDescriptor[];
}

export interface FilterChangedEvent {
  readonly filterValue: FilterExpression | null;
}

export interface PageChangedEvent {
  readonly pageIndex: number;
  readonly pageSize: number;
}

export interface SelectionChangedEvent {
  readonly selectedRowKeys: readonly Key[];
  readonly added: readonly Key[];
  readonly removed: readonly Key[];
}

export interface FocusedCellChangedEvent {
  readonly rowKey: Key | null;
  readonly columnId: string | null;
}

export interface CellEvent<T> {
  readonly rowKey: Key;
  readonly columnId: string;
  readonly data: T;
  readonly event: MouseEvent;
  cancel?: boolean;
}

export interface RowEvent<T> {
  readonly rowKey: Key;
  readonly data: T;
  readonly event: MouseEvent;
  cancel?: boolean;
}

export interface EditingStartEvent<T> {
  readonly rowKey: Key;
  readonly columnId: string | null;
  readonly data: T;
  cancel?: boolean;
}

export interface EditingCanceledEvent {
  readonly rowKey: Key;
}

export interface RowUpdatingEvent<T> {
  readonly key: Key;
  readonly values: Partial<T>;
  cancel?: boolean;
}

export interface RowUpdatedEvent<T> {
  readonly key: Key;
  readonly data: T;
}

export interface SaveFailedEvent {
  readonly error: unknown;
}

export interface ExportingEvent {
  readonly format: 'csv' | 'excel';
  cancel?: boolean;
}

export interface ExportedEvent {
  readonly format: 'csv' | 'excel';
  readonly fileName: string;
}

export interface StateChangedEvent {
  readonly state: DataGridStateSnapshot;
}

export interface DisposingEvent {
  readonly element: HTMLElement;
}

export interface DataGridOptions<T = unknown> {
  readonly dataSource?: DataSourceInput<T>;
  readonly keyExpr?: KeyExpr<T>;
  readonly columns?: readonly ColumnOptions<T>[];

  readonly sorting?: SortingOptions;
  readonly filtering?: FilteringOptions;
  readonly paging?: PagingOptions;
  readonly scrolling?: ScrollingOptions;
  readonly selection?: SelectionOptions;
  readonly editing?: EditingOptions;
  readonly grouping?: GroupingOptions;
  readonly summary?: SummaryOptions<T>;
  readonly stateStoring?: StateStoringOptions;
  readonly export?: ExportOptions;

  readonly width?: number | string;
  readonly height?: number | string;
  readonly rtlEnabled?: boolean;
  readonly showBorders?: boolean;
  readonly showRowLines?: boolean;
  readonly showColumnLines?: boolean;
  readonly rowAlternationEnabled?: boolean;
  readonly wordWrapEnabled?: boolean;
  readonly focusedRowEnabled?: boolean;
  readonly allowColumnResizing?: boolean;
  readonly allowColumnReordering?: boolean;
  readonly noDataText?: string;
  readonly locale?: string;
  readonly messages?: Readonly<Record<string, string>>;

  readonly onContentReady?: (event: ContentReadyEvent) => void;
  readonly onDataLoading?: (event: DataLoadingEvent) => void;
  readonly onDataLoaded?: (event: DataLoadedEvent<T>) => void;
  readonly onDataError?: (event: DataErrorEvent) => void;
  readonly onOptionChanged?: (event: OptionChangedEvent) => void;
  readonly onSortingChanged?: (event: SortingChangedEvent) => void;
  readonly onFilterChanged?: (event: FilterChangedEvent) => void;
  readonly onPageChanged?: (event: PageChangedEvent) => void;
  readonly onSelectionChanged?: (event: SelectionChangedEvent) => void;
  readonly onFocusedCellChanged?: (event: FocusedCellChangedEvent) => void;
  readonly onRowClick?: (event: RowEvent<T>) => void;
  readonly onCellClick?: (event: CellEvent<T>) => void;
  readonly onCellDblClick?: (event: CellEvent<T>) => void;
  readonly onEditingStart?: (event: EditingStartEvent<T>) => void;
  readonly onEditingCanceled?: (event: EditingCanceledEvent) => void;
  readonly onRowUpdating?: (event: RowUpdatingEvent<T>) => void;
  readonly onRowUpdated?: (event: RowUpdatedEvent<T>) => void;
  readonly onSaveFailed?: (event: SaveFailedEvent) => void;
  readonly onExporting?: (event: ExportingEvent) => void;
  readonly onExported?: (event: ExportedEvent) => void;
  readonly onStateChanged?: (event: StateChangedEvent) => void;
  readonly onDisposing?: (event: DisposingEvent) => void;
}

export interface DataGridApi<T = unknown> {
  readonly isDisposed: boolean;
  option<K extends keyof DataGridOptions<T>>(name: K): DataGridOptions<T>[K];
  option<K extends keyof DataGridOptions<T>>(
    name: K,
    value: DataGridOptions<T>[K],
  ): void;
  beginUpdate(): void;
  endUpdate(): void;
  repaint(): void;
  refresh(): Promise<void>;
  dispose(): void;
  getSelectedRowKeys(): Key[];
  selectRows(keys: readonly Key[], preserve?: boolean): void;
  deselectRows(keys: readonly Key[]): void;
  clearSelection(): void;
  selectAll(scope?: 'page' | 'all'): void;
  getVisibleRows(): readonly VisibleRow<T>[];
  getRowByKey(key: Key): T | undefined;
  getKeyByRowIndex(index: number): Key | undefined;
  focusCell(rowKey: Key, columnId: string): void;
  getFocusedCell(): { rowKey: Key; columnId: string } | null;
  clearFilter(): void;
  clearSorting(): void;
  getState(): DataGridStateSnapshot;
  resetState(): void;
  exportToCsv(options?: ExportOptions): Promise<void>;
}

export interface NormalizedFiltering extends Required<FilteringOptions> {
  readonly search: Required<SearchOptions>;
}

export interface NormalizedDataGridOptions<T = unknown> {
  readonly dataSource: DataSourceInput<T>;
  readonly keyExpr: KeyExpr<T> | undefined;
  readonly columns: readonly ColumnOptions<T>[];
  readonly sorting: Required<SortingOptions>;
  readonly filtering: NormalizedFiltering;
  readonly paging: Required<PagingOptions>;
  readonly scrolling: Required<ScrollingOptions>;
  readonly selection: Required<SelectionOptions>;
  readonly editing: Required<EditingOptions>;
  readonly grouping: Required<GroupingOptions>;
  readonly summary: Required<SummaryOptions<T>>;
  readonly stateStoring: Required<StateStoringOptions>;
  readonly export: Required<ExportOptions>;
  readonly display: {
    readonly width: number | string;
    readonly height: number | string;
    readonly rtlEnabled: boolean;
    readonly showBorders: boolean;
    readonly showRowLines: boolean;
    readonly showColumnLines: boolean;
    readonly rowAlternationEnabled: boolean;
    readonly wordWrapEnabled: boolean;
    readonly focusedRowEnabled: boolean;
    readonly allowColumnResizing: boolean;
    readonly allowColumnReordering: boolean;
    readonly noDataText: string;
    readonly locale: string | undefined;
    readonly messages: Readonly<Record<string, string>>;
  };
  readonly events: Readonly<Record<string, unknown>>;
}
