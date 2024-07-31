import { hasField, isRecord } from './core';
import { isLocalDataContext, LocalDataContext } from '../local/libs/data-context';
import { assertRemoteDataContext, isRemoteDataContext, RemoteDataContext } from '../remote/libs/data-context';

/**
 * Context for interacting with the data. This may represent a local data context where data can be accessed even while
 * offline. Or it may represent a remote data context where all data operations are performed against a remote CHT
 * instance.
 */
export interface DataContext {
  /**
   * Executes the provided function with this data context as the argument.
   * @param fn the function to execute
   * @returns the result of the function
   */
  bind: <T>(fn: (ctx: DataContext) => T) => T
}

const isDataContext = (context: unknown): context is DataContext => {
  return isRecord(context) && hasField(context, { name: 'bind', type: 'function' });
};

/** @internal */
export const assertDataContext: (context: unknown) => asserts context is DataContext = (context: unknown) => {
  if (!isDataContext(context) || !(isLocalDataContext(context) || isRemoteDataContext(context))) {
    throw new Error(`Invalid data context [${JSON.stringify(context)}].`);
  }
};

/** @internal */
export const adapt = <T>(
  context: DataContext,
  local: (c: LocalDataContext) => T,
  remote: (c: RemoteDataContext) => T
): T => {
  if (isLocalDataContext(context)) {
    return local(context);
  }
  assertRemoteDataContext(context);
  return remote(context);
};

interface PaginationArgs {
  limit: number;
  skip: number;
}

type FetchFunctionArgs<TFields extends Record<string, unknown>> = PaginationArgs & TFields;

/** @internal */
export const getDocumentStream = async function* <T, TFields extends Record<string, unknown>>(
  fetchFunction: (args: FetchFunctionArgs<TFields>) => Promise<T[]>,
  fetchFunctionArgs: FetchFunctionArgs<TFields>
): AsyncGenerator<T, void> {
  const { limit } = fetchFunctionArgs;
  let { skip } = fetchFunctionArgs;
  const hasMoreResults = () => skip && skip % limit === 0;

  do {
    const docs = await fetchFunction(fetchFunctionArgs);

    for (const doc of docs) {
      yield doc;
    }

    skip += docs.length;
  } while (hasMoreResults());
};
