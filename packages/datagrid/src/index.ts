/**
 * @simpleui/datagrid — tipe publik (DG-002). Implementasi dimulai DG-010.
 */
export const DATAGRID_VERSION = '0.0.0';

export { DataGridError, isDataGridError } from './errors.js';
export {
  createDataController,
  type DataController,
  type DataControllerOptions,
} from './data/data-controller.js';
export {
  clampPageIndex,
  createPageInfo,
  hasNextPage,
  pageCountFor,
  pageForRowIndex,
  pageRange,
  skipForPage,
  type PageInfo,
} from './data/paging.js';
export {
  createVirtualScroll,
  type VirtualScrollModel,
  type VirtualScrollOptions,
} from './data/virtual-scroll.js';
export {
  applyGridSort,
  clearSort,
  nextSortDirection,
  sortDirectionFor,
  sortIndexFor,
  toggleSort,
  type SortDirection,
  type ToggleSortOptions,
} from './data/sort.js';
export {
  applyGridFilter,
  buildFilterCondition,
  buildFilterRow,
  buildSearchFilter,
  defaultOperatorForType,
  isOperatorAllowed,
  MAX_SEARCH_LENGTH,
  operatorsForType,
  validateGridFilter,
  type FilterRowValue,
  type FilterRowValues,
} from './data/filter.js';
export {
  normalizeDataGridOptions,
  type NormalizeContext,
  type ValidationIssue,
} from './model/options.js';
export {
  createDefaultState,
  createGridStateStore,
  selectHiddenColumns,
  selectIsFiltered,
  selectPageCount,
  selectSelectedKeySet,
  type DataStatus,
  type FocusedCell,
  type GridState,
  type GridStateStore,
} from './model/state.js';
export {
  countHeaderRows,
  findColumnById,
  flattenColumns,
  getVisibleColumns,
  normalizeColumnModel,
  type ColumnInput,
  type ColumnModelContext,
  type ColumnState,
} from './model/columns.js';

export type {
  CellEvent,
  ColumnAlignment,
  ColumnDataType,
  ColumnFormat,
  ColumnOptions,
  ContentReadyEvent,
  DataGridApi,
  DataGridErrorCode,
  DataGridOptions,
  DataGridStateSnapshot,
  DataErrorEvent,
  DataLoadedEvent,
  DataLoadingEvent,
  DataSourceInput,
  DisposingEvent,
  EditingCanceledEvent,
  EditingMode,
  EditingOptions,
  EditingStartEvent,
  ExportedEvent,
  ExportingEvent,
  ExportOptions,
  FilterChangedEvent,
  FilteringOptions,
  FocusedCellChangedEvent,
  GroupingOptions,
  OptionChangedEvent,
  PageChangedEvent,
  PagingOptions,
  RowEvent,
  RowUpdatedEvent,
  RowUpdatingEvent,
  SaveFailedEvent,
  ScrollingOptions,
  SearchOptions,
  SelectionChangedEvent,
  SelectionMode,
  SelectionOptions,
  SortingChangedEvent,
  SortingOptions,
  StateChangedEvent,
  StateStorage,
  StateStoringOptions,
  SummaryItem,
  SummaryOptions,
  SummaryType,
  NormalizedDataGridOptions,
  NormalizedFiltering,
  VisibleRow,
} from './api/types.js';
