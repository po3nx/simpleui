import { createElement, type ReactElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

/** Adapter bridge React (FND-028): mount/update/unmount dengan sinkron. */
export interface BridgeOptions {
  readonly items?: readonly string[];
  readonly label?: string;
}

export interface AdapterBridge {
  mount(container: HTMLElement, options?: BridgeOptions): void;
  update(options: BridgeOptions): void;
  unmount(): void;
}

function View(options: BridgeOptions): ReactElement {
  return createElement(
    'ul',
    { className: 'sui-adapter-host', 'aria-label': options.label },
    (options.items ?? []).map((item, index) =>
      createElement('li', { key: index }, item),
    ),
  );
}

export function createReactBridge(): AdapterBridge {
  let root: Root | null = null;

  return {
    mount(container, options = {}) {
      root = createRoot(container);
      // render React 19 bersifat concurrent; flushSync menjaga kontrak sinkron.
      flushSync(() => root?.render(createElement(View, options)));
    },
    update(options) {
      flushSync(() => root?.render(createElement(View, options)));
    },
    unmount() {
      flushSync(() => root?.unmount());
      root = null;
    },
  };
}
