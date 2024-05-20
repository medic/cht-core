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

