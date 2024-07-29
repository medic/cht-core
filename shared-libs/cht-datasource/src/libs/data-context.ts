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

/** @internal */
export const getDocumentStream = async function* <T, Args extends unknown[]>(
  fetchFunction: (...args: Args) => Promise<T[]>,
  fetchFunctionArgs: {
    limit: number;
    skip: number;
  } & Record<string, unknown>
): AsyncGenerator<unknown, void> {
  const { limit } = fetchFunctionArgs;
  let { skip } = fetchFunctionArgs;
  const hasMoreResults = () => skip && skip % limit === 0;

  do {
    const docs = await fetchFunction(...(Object.values(fetchFunctionArgs) as Args));

    for (const doc of docs) {
      yield doc;
    }

    skip += docs.length;
  } while (hasMoreResults());
};
