import logger from '@medic/logger';
import { DataContext } from '../../libs/data-context';
import { isString, Nullable } from '../../libs/core';

/** @internal */
export interface RemoteDataContext extends DataContext {
  readonly url: string
}

/** @internal */
export const isRemoteDataContext = (context: DataContext): context is RemoteDataContext => 'url' in context;

/** @internal */
export const assertRemoteDataContext: (context: DataContext) => asserts context is RemoteDataContext = (
  context: DataContext
) => {
  if (!isRemoteDataContext(context)) {
    throw new Error(`Invalid remote data context [${JSON.stringify(context)}].`);
  }
};

/**
 * Returns the data context based on a remote CHT API server. This function should not be used when offline
 * functionality is required.
 * @param url the URL of the remote CHT API server. If not provided, requests will be made relative to the current
 * location.
 * @returns the data context
 */
export const getRemoteDataContext = (url = ''): DataContext => {
  if (!isString(url)) {
    throw new Error(`Invalid URL [${JSON.stringify(url)}].`);
  }

  return { url };
};

/** @internal */
export const get = (
  context: RemoteDataContext,
  path = ''
) => async <T>(resource: string): Promise<Nullable<T>> => {
  try {
    const response = await fetch(`${context.url}/${path}${resource}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(response.statusText);
    }

    return (await response.json()) as T;
  } catch (error) {
    logger.error(`Failed to fetch ${resource} from ${context.url}`, error);
    throw error;
  }
};