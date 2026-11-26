/**
 * Adapter vanilla (FND-028): bridge lifecycle mount/update/unmount tanpa
 * framework. Dipakai sebagai referensi perilaku untuk adapter lain.
 */

export interface BridgeOptions {
  readonly items?: readonly string[];
  readonly label?: string;
}

export interface AdapterBridge {
  mount(container: HTMLElement, options?: BridgeOptions): void;
  update(options: BridgeOptions): void;
  unmount(): void;
}

function render(options: BridgeOptions): HTMLElement {
  const list = document.createElement('ul');
  list.className = 'sui-adapter-host';
  if (options.label) list.setAttribute('aria-label', options.label);

  for (const item of options.items ?? []) {
    const entry = document.createElement('li');
    entry.textContent = item;
    list.append(entry);
  }

  return list;
}

export function createVanillaBridge(): AdapterBridge {
  let host: HTMLElement | null = null;
  let element: HTMLElement | null = null;

  return {
    mount(container, options = {}) {
      host = container;
      element = render(options);
      host.replaceChildren(element);
    },
    update(options) {
      if (!element || !host) return;
      element.replaceWith(render(options));
      element = host.firstElementChild as HTMLElement | null;
    },
    unmount() {
      element?.remove();
      element = null;
      host = null;
    },
  };
}

export {
  createDataGrid,
  type VanillaDataGrid,
  type VanillaDataGridOptions,
} from './grid.js';
export { getDataGridInstance, registerJQueryPlugin } from './jquery.js';
