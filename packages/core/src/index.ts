export { VERSION } from './version.js';
export { isBrowser, assertBrowser } from './env.js';

export { SimpleUIError, isSimpleUIError } from './kernel/errors.js';
export type { CoreErrorCode } from './kernel/errors.js';
export { DisposableBag } from './kernel/disposable.js';
export type { Disposer } from './kernel/disposable.js';
export { Emitter } from './kernel/emitter.js';
export type {
  EmitterOptions,
  EventListener,
  EventMap,
} from './kernel/emitter.js';
export { mergeOptions } from './kernel/options.js';
export { ComponentKernel, isDevMode } from './kernel/kernel.js';

export { createStore } from './state/store.js';
export type { StateListener, StatePatch, Store } from './state/store.js';
export { createSelector } from './state/selector.js';
export type { EqualityFn } from './state/selector.js';
export { createScheduler, yieldToMain } from './state/scheduler.js';
export type { Scheduler, SchedulerHost } from './state/scheduler.js';

export {
  classNames,
  createElement,
  getScrollParent,
  scrollIntoViewIfNeeded,
  setAttributes,
  setStyle,
  setStyles,
  toggleClass,
} from './dom/dom.js';
export type { ElementOptions } from './dom/dom.js';

export {
  isActivationKey,
  isEscapeKey,
  isNavigationKey,
  nextIndex,
} from './a11y/keyboard.js';
export type {
  NavigationOptions,
  NavigationOrientation,
} from './a11y/keyboard.js';
export { RovingTabindex } from './a11y/roving.js';
export type { RovingTabindexOptions } from './a11y/roving.js';
export { FocusTrap, getFocusable } from './a11y/focus-trap.js';
export type { FocusTrapOptions } from './a11y/focus-trap.js';
export { Announcer } from './a11y/announcer.js';
export type { AnnouncerOptions, Politeness } from './a11y/announcer.js';

export {
  createLayoutService,
  measureElement,
} from './layout/layout-service.js';
export type {
  LayoutService,
  LayoutServiceOptions,
  LayoutSize,
  ResizeEntryLike,
  ResizeObserverLike,
} from './layout/layout-service.js';

export {
  createLocaleService,
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  resolveLocale,
} from './i18n/locale-service.js';
export type { LocaleOptions, LocaleService } from './i18n/locale-service.js';
export {
  DEFAULT_MESSAGES,
  formatMessage,
  resolvePlural,
} from './i18n/messages.js';
export type {
  MessageCatalog,
  MessageParams,
  MessageValue,
  PluralForms,
} from './i18n/messages.js';
export {
  getDirection,
  isPseudoLocale,
  isRtlLocale,
  pseudoLocalize,
} from './i18n/locale.js';
export type { TextDirection } from './i18n/locale.js';

export { createTemplateBridge, TemplateBridge } from './template/template.js';
export type {
  TemplateBridgeOptions,
  TemplateCallback,
  TemplateColumn,
  TemplateContext,
  TemplateHandle,
  TemplatePhase,
  TemplateRenderer,
  TemplateSource,
} from './template/template.js';

export { ArrayStore } from './data/array-store.js';
export type { ArrayStoreOptions } from './data/array-store.js';
export { cacheKeyFor, CachedStore } from './data/cache.js';
export type { CachedStoreOptions } from './data/cache.js';
export { CustomStore } from './data/custom-store.js';
export type { CustomStoreOptions } from './data/custom-store.js';
export { DataError, isDataError, toDataError } from './data/errors.js';
export type { DataErrorCode, DataErrorOptions } from './data/errors.js';
export {
  createTimeoutSignal,
  DEFAULT_TIMEOUT_MS,
  throwIfAborted,
} from './data/abort.js';
export type { TimeoutSignal } from './data/abort.js';
export {
  applyFilter,
  applyPage,
  applySort,
  MAX_FILTER_DEPTH,
  MAX_FILTER_NODES,
  MAX_IN_VALUES,
  MAX_TAKE,
  normalizeOptions,
  runQuery,
  summarize,
  validateFilter,
} from './data/query.js';
export type { NormalizedQuery, SummaryKind } from './data/query.js';
export type {
  FilterExpression,
  FilterOperator,
  GroupDescriptor,
  Key,
  KeyExpr,
  LoadOptions,
  LoadResult,
  SortDescriptor,
  // `Store` sudah dipakai reactive store; data layer diekspor sebagai DataStore.
  Store as DataStore,
  StoreCapabilities,
} from './data/types.js';

export { createVirtualizer, Virtualizer } from './view/virtualizer.js';
export type {
  VirtualAlign,
  VirtualRange,
  VirtualizerOptions,
} from './view/virtualizer.js';
