import type { ColumnState } from '../model/columns.js';
import { createLookupResolver, type LookupResolver } from '../data/lookup.js';

/** State lookup per renderer (DG-065) dan helper label sel. */
export interface LookupCellState {
  readonly resolvers: Map<string, LookupResolver>;
  readonly requested: Set<string>;
}

export function createLookupCellState(): LookupCellState {
  return { resolvers: new Map(), requested: new Set() };
}

export function lookupText<T extends object>(
  column: ColumnState<T>,
  value: unknown,
  state: LookupCellState,
  onReady: () => void,
): string | undefined {
  const lookup = column.lookup;
  if (!lookup) return undefined;
  let resolver = state.resolvers.get(column.id);
  if (!resolver) {
    resolver = createLookupResolver(lookup);
    state.resolvers.set(column.id, resolver);
  }
  const label = resolver.getLabel(value);
  if (label !== undefined || value === null || value === undefined) {
    return label;
  }
  const requestKey = `${column.id}:${String(value)}`;
  if (!state.requested.has(requestKey)) {
    state.requested.add(requestKey);
    void resolver.ensure([value]).then(onReady);
  }
  return undefined;
}
