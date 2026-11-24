/**
 * Kontrak data layer (FND-018, docs/03-data-layer.md §2).
 *
 * Semua tipe read-only: core tidak memutasi objek milik consumer.
 */

export type Key = string | number;

export type KeyExpr<T> = keyof T | readonly (keyof T)[] | ((row: T) => Key);

export interface SortDescriptor {
  readonly selector: string;
  readonly desc: boolean;
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'between'
  | 'isNull'
  | 'isNotNull';

export type FilterExpression =
  | readonly [field: string, operator: FilterOperator, value?: unknown]
  | readonly ['and' | 'or', ...FilterExpression[]]
  | readonly ['not', FilterExpression];

export interface GroupDescriptor {
  readonly selector: string;
  readonly desc?: boolean;
  readonly isExpanded?: boolean;
}

export interface LoadOptions {
  readonly skip?: number;
  readonly take?: number;
  readonly sort?: readonly SortDescriptor[];
  readonly filter?: FilterExpression;
  readonly group?: readonly GroupDescriptor[];
  readonly requireTotalCount?: boolean;
  readonly requireGroupCount?: boolean;
  readonly signal?: AbortSignal;
}

export interface LoadResult<T> {
  readonly data: readonly T[];
  readonly totalCount?: number;
  readonly groupCount?: number;
  readonly summary?: Readonly<Record<string, number>>;
}

export interface StoreCapabilities {
  readonly remote: boolean;
  readonly sort: boolean;
  readonly filter: boolean;
  readonly group: boolean;
  readonly summary: boolean;
  readonly paging: boolean;
  readonly crud: boolean;
}

export interface Store<T> {
  readonly key: KeyExpr<T>;
  readonly capabilities: StoreCapabilities;
  load(options: LoadOptions): Promise<LoadResult<T>>;
  byKey(key: Key, signal?: AbortSignal): Promise<T | undefined>;
  insert?(values: Partial<T>): Promise<T>;
  update?(key: Key, values: Partial<T>): Promise<T>;
  remove?(key: Key): Promise<void>;
}
