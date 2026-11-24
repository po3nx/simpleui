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
