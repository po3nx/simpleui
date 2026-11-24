import { createApp, h, nextTick, reactive, type App } from 'vue';

/** Adapter bridge Vue (FND-028): state reaktif + unmount bersih. */
export interface BridgeOptions {
  readonly items?: readonly string[];
  readonly label?: string;
}

export interface AdapterBridge {
  mount(container: HTMLElement, options?: BridgeOptions): void;
  update(options: BridgeOptions): Promise<void> | void;
  unmount(): void;
}

export function createVueBridge(): AdapterBridge {
  const state = reactive<BridgeOptions>({ items: [], label: '' });
  const Root = {
    setup() {
      return () =>
        h(
          'ul',
          { class: 'sui-adapter-host', 'aria-label': state.label },
          (state.items ?? []).map((item, index) =>
            h('li', { key: index }, item),
          ),
        );
    },
  };
  let app: App | null = null;

  return {
    mount(container, options = {}) {
      Object.assign(state, options);
      app = createApp(Root);
      app.mount(container);
    },
    update(options) {
      Object.assign(state, options);
      return nextTick();
    },
    unmount() {
      app?.unmount();
      app = null;
    },
  };
}
