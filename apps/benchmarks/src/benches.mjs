import {
  ArrayStore,
  createSelector,
  createStore,
  Virtualizer,
} from '@simpleui/core';
import { createRows } from '@simpleui/testing';

/** Dataset deterministik untuk semua benchmark. */
const ROWS = createRows({ seed: 'benchmarks', count: 10_000 });

const STORE = new ArrayStore(ROWS, { key: 'id' });

const VIRTUALIZER = new Virtualizer({
  itemCount: 100_000,
  itemSize: 32,
  viewportSize: 800,
});

const NAVIGATION_ROWS = createRows({ seed: 'benchmarks', count: 60 });
const selectSecondPage = createSelector((state) => state.rows.slice(50, 100));

const REACTIVE = createStore({ count: 0 });
REACTIVE.subscribe(() => {});

let scrollOffset = 0;

export const BENCHMARKS = [
  {
    name: 'virtualizer.setScrollOffset (100k baris)',
    fn() {
      scrollOffset = (scrollOffset + 997) % 3_199_200;
      VIRTUALIZER.setScrollOffset(scrollOffset);
    },
  },
  {
    name: 'ArrayStore.load filter+sort+page (10k baris)',
    async fn() {
      await STORE.load({
        filter: ['active', 'eq', true],
        sort: [{ selector: 'name', desc: false }],
        skip: 50,
        take: 50,
      });
    },
  },
  {
    name: 'selector memoized (state sama)',
    fn() {
      selectSecondPage({ rows: NAVIGATION_ROWS });
    },
  },
  {
    name: 'store.transaction (10 perubahan)',
    fn() {
      REACTIVE.transaction(() => {
        for (let index = 0; index < 10; index += 1) {
          REACTIVE.setState({ count: index });
        }
      });
    },
  },
];
