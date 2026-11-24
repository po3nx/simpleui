/**
 * Selector murni dan memoized (FND-012, docs/01-arsitektur.md §5.2).
 *
 * Memoization menjaga identitas hasil tetap sama bila state tidak berubah —
 * penting agar consumer (dan adapter React) tidak melakukan render ulang sia-sia.
 */

export type EqualityFn<TValue> = (a: TValue, b: TValue) => boolean;

/**
 * Bungkus fungsi seleksi dengan cache satu entri.
 *
 * - State yang sama (identitas) tidak menghitung ulang.
 * - Bila hasil baru dianggap sama oleh `isEqual`, hasil lama dikembalikan
 *   sehingga identitas tetap stabil.
 */
export function createSelector<TState, TResult>(
  select: (state: Readonly<TState>) => TResult,
  isEqual: EqualityFn<TResult> = Object.is,
): (state: Readonly<TState>) => TResult {
  let lastState: Readonly<TState> | undefined;
  let lastResult: TResult;
  let hasResult = false;

  return (state: Readonly<TState>): TResult => {
    if (hasResult && Object.is(state, lastState)) return lastResult;

    const next = select(state);
    lastState = state;

    if (hasResult && isEqual(next, lastResult)) return lastResult;

    lastResult = next;
    hasResult = true;
    return lastResult;
  };
}
