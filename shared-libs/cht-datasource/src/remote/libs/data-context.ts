import rpn from 'request-promise-native';
import logger from '@medic/logger';
import { DataContext } from '../../libs/data-context';
import { isString, Nullable } from '../../libs/core';
import { StatusCodeError } from 'request-promise-native/errors';

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
 * @returns the data context
 */
export const getRemoteDataContext = (url: string): DataContext => {
  if (!isString(url) || url.length === 0) {
    throw new Error(`Invalid UUID [${JSON.stringify(url)}].`);
  }

  return { url };
};

/** @internal */
export const get = (
  context: RemoteDataContext,
  path = ''
) => async <T>(resource: string): Promise<Nullable<T>> => {
  try {
    const uri = `${context.url}/${path}${resource}`;
    return await rpn.get({ uri, json: true }) as T;
  } catch (error) {
    if ((error as StatusCodeError).statusCode === 404) {
      return null;
    }

    logger.error(`Failed to fetch ${resource} from ${context.url}`, error);
    throw error;
  }
};
