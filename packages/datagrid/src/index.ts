/**
 * @simpleui/datagrid — tipe publik (DG-002). Implementasi dimulai DG-010.
 */
export const DATAGRID_VERSION = '0.0.0';

export { DataGridError, isDataGridError } from './errors.js';
export {
  cellValueFor,
  DEFAULT_EMPTY_TEXT,
  formatCellValue,
  formatRowCell,
  setCellText,
  type CellFormatOptions,
} from './view/cell-renderer.js';
export {
  applyColumnOrder,
  moveColumn,
  moveColumnTo,
  visibleColumnIds,
} from './view/column-reorder.js';
export {
  attachColumnResize,
  clampColumnWidth,
  RESIZE_STEP,
  type ColumnResizeOptions,
} from './view/column-resize.js';
export {
  attachContextMenu,
  guardClipboardText,
  tsvCell,
  type ContextMenu,
  type ContextMenuOptions,
} from './view/context-menu.js';
export {
  createSummaryFooter,
  type SummaryFooter,
  type SummaryFooterOptions,
} from './view/summary-footer.js';
export {
  downloadCsv,
  exportCsv,
  sanitizeFilename,
  type CsvExportOptions,
  type CsvExportResult,
} from './data/export.js';
export {
  createColumnChooser,
  type ColumnChooser,
  type ColumnChooserOptions,
} from './view/column-chooser.js';
export {
  attachGridKeyboard,
  type GridKeyboardOptions,
} from './view/keyboard.js';
export {
  createSelectionColumn,
  SELECTION_COLUMN_ID,
  type SelectionColumnOptions,
} from './view/selection-column.js';
export {
  createPager,
  type Pager,
  type PagerOptions,
  type PagingState,
} from './view/pager.js';
export {
  createSearchPanel,
  type SearchPanel,
  type SearchPanelOptions,
} from './view/search-panel.js';
export {
  createHeaderFilter,
  type HeaderFilter,
  type HeaderFilterOptions,
} from './view/header-filter.js';
export {
  createFilterRow,
  type FilterRow,
  type FilterRowOptions,
} from './view/filter-row.js';
export {
  createStatusView,
  DEFAULT_STATUS_MESSAGES,
  type GridStatusKind,
  type GridStatusOptions,
  type StatusView,
} from './view/status-view.js';
export {
  computeColumnLayout,
  type ColumnLayout,
  type ColumnLayoutEntry,
} from './view/column-virtualizer.js';
export {
  createRowRenderer,
  type RowRenderer,
  type RowRendererOptions,
} from './view/row-renderer.js';
export {
  createGridView,
  type GridView,
  type GridViewOptions,
} from './view/grid-view.js';
export {
  createDataController,
  type DataController,
  type DataControllerOptions,
  type RemoteOperationsConfig,
  type RemoteOperationsOption,
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
  createStatePersistence,
  CURRENT_SNAPSHOT_VERSION,
  DEFAULT_MAX_SNAPSHOT_SIZE,
  type StatePersistence,
  type StatePersistenceOptions,
} from './data/persistence.js';
export {
  computeGroupSummary,
  computeSummary,
  formatSummary,
  type FormatSummaryOptions,
  type SummaryComputeOptions,
  type SummaryValues,
} from './data/summary.js';
export {
  flattenGroups,
  groupKey,
  groupRows,
  type GroupedEntry,
  type GroupNode,
  type GroupOptions,
} from './data/grouping.js';
export {
  classifyError,
  DEFAULT_ERROR_MESSAGES,
  describeGridError,
  isAbortError,
  isRetryable,
  toGridError,
  type GridErrorInfo,
} from './data/error-utils.js';
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
  createFocusModel,
  type Edge,
  type EdgeScope,
  type FocusModel,
  type FocusModelOptions,
  type MoveDirection,
} from './model/focus.js';
export {
  createSelectionModel,
  type SelectionModel,
  type SelectionModelOptions,
} from './model/selection.js';
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
  assertUniqueKeys,
  buildKeyIndex,
  createKeyResolver,
  encodeKey,
  keyToDomId,
  type KeyResolver,
} from './model/key.js';
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
