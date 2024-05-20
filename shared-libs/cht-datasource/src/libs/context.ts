import { isRecord } from './core';

/**
 * Context for interacting with the data. This may represent a local data context where data can be accessed even while
 * offline. Or it may represent a remote data context where all data operations are performed against a remote CHT
 * instance.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataContext {}

/** @internal */
export const assertDataContext: (context: unknown) => asserts context is DataContext = (context: unknown) => {
  if (!isRecord(context)) {
    throw new Error(`Invalid data context [${JSON.stringify(context)}].`);
  }
};

/**
 * Returns the data context based on a remote CHT API server. This function should not be used when offline
 * functionality is required.
 * @returns the data context
 */
export const getRemoteDataContext = (): DataContext => {
  // TODO Need to determine what initial arguments are needed for the remote data context (e.g. session cookie...)
  return { };
};
