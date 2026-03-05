/**
 * Returns an AsyncGenerator that yields the given values.
 * @param values the values to yield
 */
export const fakeGenerator = <T>(values: T[] = []): AsyncGenerator<Awaited<T>> => {
  return (async function* () {
    for (const value of values) {
      yield value;
    }
  })();
};
