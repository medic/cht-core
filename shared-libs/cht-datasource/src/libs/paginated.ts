import { getPagedGenerator, Nullable, Page } from './core';
import { adapt, assertDataContext, DataContext } from './data-context';
import { LocalDataContext } from '../local/libs/data-context';
import { RemoteDataContext } from '../remote/libs/data-context';
import { assertCursor, assertLimit } from './parameter-validators';

/**
 * A curried paged getter. The qualifier is the leading argument; it is optional precisely when the qualifier type
 * `Q` admits `undefined` (i.e. the getter supports being called with no qualifier to page all entities). Getters
 * with a required qualifier (e.g. by contact type) keep it mandatory.
 * @internal
 */
export type PagedDataFn<Q, T> = undefined extends Q
  ? (qualifier?: Q, cursor?: Nullable<string>, limit?: number | `${number}`) => Promise<Page<T>>
  : (qualifier: Q, cursor?: Nullable<string>, limit?: number | `${number}`) => Promise<Page<T>>;

/**
 * A curried generator getter. As with {@link PagedDataFn}, the qualifier is optional precisely when `Q` admits
 * `undefined`.
 * @internal
 */
export type GeneratorFn<Q, T> = undefined extends Q
  ? (qualifier?: Q) => AsyncGenerator<T, null>
  : (qualifier: Q) => AsyncGenerator<T, null>;

/**
 * Builds a data-context factory for a paged getter. The returned function resolves the appropriate local/remote
 * implementation via {@link adapt} and wraps it with the validation shared by every paged getter
 * (`assertDataContext`, `assertCursor`, `assertLimit`, and the provided qualifier assertion). The qualifier is the
 * leading argument and is optional when `Q` admits `undefined` (paging all entities).
 * @param localFn the local implementation
 * @param remoteFn the remote implementation
 * @param assertQualifier asserts the provided qualifier is valid for this getter
 * @param defaultLimit the default page limit used when none is provided
 * @returns a function that, given a data context, returns the curried paged getter
 * @internal
 */
export const getPagedDataFn = <Q, T>(
  localFn: (c: LocalDataContext) => (qualifier: Q, cursor: Nullable<string>, limit: number) => Promise<Page<T>>,
  remoteFn: (c: RemoteDataContext) => (qualifier: Q, cursor: Nullable<string>, limit: number) => Promise<Page<T>>,
  assertQualifier: (qualifier: unknown) => asserts qualifier is Q,
  defaultLimit: number,
) => (context: DataContext): PagedDataFn<Q, T> => {
  assertDataContext(context);
  const fn = adapt(context, localFn, remoteFn);

  return (async (
    qualifier?: Q,
    cursor: Nullable<string> = null,
    limit: number | `${number}` = defaultLimit
  ): Promise<Page<T>> => {
    assertCursor(cursor);
    assertLimit(limit);
    assertQualifier(qualifier);

    return fn(qualifier, cursor, Number(limit));
  }) as PagedDataFn<Q, T>;
};

/**
 * Builds a data-context factory for a generator that drains all the pages produced by the given paged getter.
 * @param pagedFn the paged getter factory to drain (e.g. the `getPage`/`getUuidsPage` for this entity)
 * @param assertQualifier asserts the provided qualifier is valid for this getter
 * @returns a function that, given a data context, returns the curried generator
 * @internal
 */
export const getGeneratorFn = <Q, T>(
  pagedFn: (context: DataContext) => PagedDataFn<Q, T>,
  assertQualifier: (qualifier: unknown) => asserts qualifier is Q,
) => (context: DataContext): GeneratorFn<Q, T> => {
  assertDataContext(context);
  const getPage = context.bind(pagedFn);

  return ((qualifier?: Q): AsyncGenerator<T, null> => {
    assertQualifier(qualifier);

    return getPagedGenerator(getPage, qualifier);
  }) as GeneratorFn<Q, T>;
};
