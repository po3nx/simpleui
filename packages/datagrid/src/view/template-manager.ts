import {
  TemplateBridge,
  type TemplateContext,
  type TemplateHandle,
  type TemplatePhase,
  type TemplateRenderer,
} from '@simpleui/core';

/**
 * Manajer template sel/header (DG-035): satu handle per container, update saat
 * baris didaur ulang, dispose saat kolom berubah atau grid dilepas. Error
 * template dilaporkan tanpa menghentikan render.
 */

export interface TemplateManagerOptions {
  readonly onError?:
    ((error: unknown, phase: TemplatePhase) => void) | undefined;
}

interface MountedTemplate {
  readonly template: TemplateRenderer;
  readonly handle: TemplateHandle;
}

export class TemplateManager {
  readonly #bridges = new Map<TemplateRenderer, TemplateBridge<unknown>>();
  readonly #handles = new Map<HTMLElement, MountedTemplate>();
  readonly #onError: TemplateManagerOptions['onError'];
  #disposed = false;

  constructor(options: TemplateManagerOptions = {}) {
    this.#onError = options.onError;
  }

  #bridge(template: TemplateRenderer): TemplateBridge<unknown> {
    const existing = this.#bridges.get(template);
    if (existing) return existing;
    const bridge = new TemplateBridge<unknown>(template, {
      ...(this.#onError ? { onError: this.#onError } : {}),
    });
    this.#bridges.set(template, bridge);
    return bridge;
  }

  mount(
    container: HTMLElement,
    template: TemplateRenderer,
    context: TemplateContext<unknown>,
  ): void {
    if (this.#disposed) return;
    const existing = this.#handles.get(container);

    if (existing?.template === template) {
      existing.handle.update(context);
      return;
    }

    if (existing) {
      existing.handle.dispose();
      this.#handles.delete(container);
    }

    container.replaceChildren();
    const handle = this.#bridge(template).createHandle(container, context);
    this.#handles.set(container, { template, handle });
  }

  unmount(container: HTMLElement): void {
    const existing = this.#handles.get(container);
    if (!existing) return;
    existing.handle.dispose();
    this.#handles.delete(container);
  }

  clear(): void {
    for (const container of [...this.#handles.keys()]) this.unmount(container);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.clear();
    for (const bridge of this.#bridges.values()) bridge.dispose();
    this.#bridges.clear();
  }
}
