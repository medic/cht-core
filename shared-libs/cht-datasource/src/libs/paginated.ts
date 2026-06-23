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
 * The named arguments for {@link getPagedDataFn}.
 * @internal
 */
export interface PagedDataFnConfig<Q, T> {
  /** the local implementation */
  localFn: (c: LocalDataContext) => (qualifier: Q, cursor: Nullable<string>, limit: number) => Promise<Page<T>>;
  /** the remote implementation */
  remoteFn: (c: RemoteDataContext) => (qualifier: Q, cursor: Nullable<string>, limit: number) => Promise<Page<T>>;
  /** asserts the provided qualifier is valid for this getter */
  assertQualifier: (qualifier: unknown) => asserts qualifier is Q;
  /** the default page limit used when none is provided */
  defaultLimit: number;
}

/**
 * Builds a data-context factory for a paged getter. The returned function resolves the appropriate local/remote
 * implementation via {@link adapt} and wraps it with the validation shared by every paged getter
 * (`assertDataContext`, `assertCursor`, `assertLimit`, and the provided qualifier assertion). The qualifier is the
 * leading argument and is optional when `Q` admits `undefined` (paging all entities).
 * @param config the named arguments for the paged getter (see {@link PagedDataFnConfig})
 * @returns a function that, given a data context, returns the curried paged getter
 * @internal
 */
export const getPagedDataFn = <Q, T>(config: PagedDataFnConfig<Q, T>) => (context: DataContext): PagedDataFn<Q, T> => {
  assertDataContext(context);
  const { localFn, remoteFn, defaultLimit } = config;
  // An explicitly-typed local is required for the assertion signature to narrow (a destructured binding would not).
  const assertQualifier: (qualifier: unknown) => asserts qualifier is Q = config.assertQualifier;
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
 * The named arguments for {@link getGeneratorFn}.
 * @internal
 */
export interface GeneratorFnConfig<Q, T> {
  /** the paged getter factory to drain (e.g. the `getPage`/`getUuidsPage` for this entity) */
  pagedFn: (context: DataContext) => PagedDataFn<Q, T>;
  /** asserts the provided qualifier is valid for this getter */
  assertQualifier: (qualifier: unknown) => asserts qualifier is Q;
}

/**
 * Builds a data-context factory for a generator that drains all the pages produced by the given paged getter.
 * @param config the named arguments for the generator (see {@link GeneratorFnConfig})
 * @returns a function that, given a data context, returns the curried generator
 * @internal
 */
export const getGeneratorFn = <Q, T>(config: GeneratorFnConfig<Q, T>) => (context: DataContext): GeneratorFn<Q, T> => {
  assertDataContext(context);
  // An explicitly-typed local is required for the assertion signature to narrow (a destructured binding would not).
  const assertQualifier: (qualifier: unknown) => asserts qualifier is Q = config.assertQualifier;
  const getPage = context.bind(config.pagedFn);

  return ((qualifier?: Q): AsyncGenerator<T, null> => {
    assertQualifier(qualifier);

    return getPagedGenerator(getPage, qualifier);
  }) as GeneratorFn<Q, T>;
};
