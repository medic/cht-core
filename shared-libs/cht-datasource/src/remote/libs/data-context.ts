import logger from '@medic/logger';
import { DataContext } from '../../libs/data-context';
import { AbstractDataContext, isString, Nullable } from '../../libs/core';

/** @internal */
export class RemoteDataContext extends AbstractDataContext {
  /** @internal */
  constructor(readonly url: string) {
    super();
  }
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

  return new RemoteDataContext(url);
};

/** @internal */
export const getResource = (context: RemoteDataContext, path: string) => async <T>(
  identifier: string,
  queryParams?: Record<string, string>
): Promise<Nullable<T>> => {
  const params = new URLSearchParams(queryParams).toString();
  try {
    const response = await fetch(`${context.url}/${path}/${identifier}?${params}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(response.statusText);
    }

    return (await response.json()) as T;
  } catch (error) {
    logger.error(`Failed to fetch ${identifier} from ${context.url}/${path}`, error);
    throw error;
  }
};
