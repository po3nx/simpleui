import '@angular/compiler';

import {
  Component,
  createComponent,
  provideZonelessChangeDetection,
  signal,
  type ApplicationRef,
  type ComponentRef,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';

/**
 * Adapter bridge Angular (FND-028): mount/update/unmount dengan aplikasi
 * zoneless dan JIT compiler untuk template inline.
 */

export interface BridgeOptions {
  readonly items?: readonly string[];
  readonly label?: string;
}

export interface AdapterBridge {
  mount(container: HTMLElement, options?: BridgeOptions): Promise<void>;
  update(options: BridgeOptions): void;
  unmount(): void;
}

const items = signal<readonly string[]>([]);
const label = signal('');

@Component({
  selector: 'sui-angular-adapter',
  standalone: true,
  template: `<ul class="sui-adapter-host" [attr.aria-label]="label()">
    @for (item of items(); track $index) {
      <li>{{ item }}</li>
    }
  </ul>`,
})
class RootComponent {
  readonly items = items;
  readonly label = label;
}

export function createAngularBridge(): AdapterBridge {
  let appRef: ApplicationRef | null = null;
  let componentRef: ComponentRef<RootComponent> | null = null;
  let host: HTMLElement | null = null;

  const apply = (options: BridgeOptions): void => {
    items.set(options.items ?? []);
    label.set(options.label ?? '');
    componentRef?.changeDetectorRef.detectChanges();
  };

  return {
    async mount(container, options = {}) {
      items.set(options.items ?? []);
      label.set(options.label ?? '');
      appRef = await createApplication({
        providers: [provideZonelessChangeDetection()],
      });
      // Host terpisah: destroy Angular tidak selalu melepas node dari container,
      // dan container milik consumer tidak boleh dikosongkan seluruhnya.
      host = document.createElement('div');
      host.className = 'sui-angular-host';
      container.append(host);
      componentRef = createComponent(RootComponent, {
        environmentInjector: appRef.injector,
        hostElement: host,
      });
      appRef.attachView(componentRef.hostView);
      componentRef.changeDetectorRef.detectChanges();
    },
    update: apply,
    unmount() {
      componentRef?.destroy();
      appRef?.destroy();
      host?.remove();
      componentRef = null;
      appRef = null;
      host = null;
    },
  };
}
