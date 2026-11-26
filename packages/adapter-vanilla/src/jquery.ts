import {
  createDataGrid,
  type VanillaDataGrid,
  type VanillaDataGridOptions,
} from './grid.js';

/**
 * Bridge jQuery opsional (DG-053): plugin `$(el).simpleuiDataGrid(options)`.
 */

export interface JQueryStaticLike {
  readonly fn: Record<string, unknown>;
}

interface JQueryElementLike {
  readonly 0?: HTMLElement;
}

const instances = new WeakMap<HTMLElement, VanillaDataGrid>();

export function getDataGridInstance(
  element: HTMLElement,
): VanillaDataGrid | undefined {
  return instances.get(element);
}

export function registerJQueryPlugin(jquery?: JQueryStaticLike): boolean {
  const $ = jquery ?? (globalThis as { jQuery?: JQueryStaticLike }).jQuery;
  if (!$ || typeof $.fn !== 'object') return false;

  ($.fn as Record<string, unknown>)['simpleuiDataGrid'] = function (
    this: JQueryElementLike,
    options: VanillaDataGridOptions,
  ): unknown {
    const element = this[0];
    if (!element) return this;
    const existing = instances.get(element);
    if (existing) {
      if (options) existing.update(options);
    } else {
      instances.set(element, createDataGrid(element, options));
    }
    return this;
  };
  return true;
}
