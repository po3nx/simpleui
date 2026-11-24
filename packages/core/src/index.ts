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
