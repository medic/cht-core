import { isRecord } from './core';
import { isLocalDataContext, LocalDataContext } from '../local/libs/data-context';
import { assertRemoteDataContext, isRemoteDataContext, RemoteDataContext } from '../remote/libs/data-context';

/**
 * Context for interacting with the data. This may represent a local data context where data can be accessed even while
 * offline. Or it may represent a remote data context where all data operations are performed against a remote CHT
 * instance.
 */
export type DataContext = Readonly<object>;

/** @internal */
export const assertDataContext: (context: unknown) => asserts context is DataContext = (context: unknown) => {
  if (!isRecord(context) || !(isLocalDataContext(context) || isRemoteDataContext(context))) {
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
