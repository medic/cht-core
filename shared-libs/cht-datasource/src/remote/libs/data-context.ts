import logger from '@medic/logger';
import { DataContext } from '../../libs/data-context';
import { AbstractDataContext, Identifiable, isString, Nullable } from '../../libs/core';
import { InvalidArgumentError } from '../../libs/error';

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
      } else if (response.status === 400) {
        const errorMessage = await response.text();
        throw new InvalidArgumentError(errorMessage);
      }
      throw new Error(response.statusText);
    }

    return (await response.json()) as T;
  } catch (error) {
    logger.error(`Failed to fetch ${identifier} from ${context.url}/${path}`, error);
    throw error;
  }
};

/** @internal */
export const getResources = (context: RemoteDataContext, path: string) => async <T>(
  queryParams?: Record<string, string>,
): Promise<T> => {
  const params = new URLSearchParams(queryParams).toString();
  try {
    const response = await fetch(`${context.url}/${path}?${params}`);
    if (response.status === 400) {
      const errorMessage = await response.text();
      throw new InvalidArgumentError(errorMessage);
    } else if (!response.ok) {
      throw new Error(response.statusText);
    }

    return (await response.json()) as T;
  } catch (error) {
    logger.error(`Failed to fetch resources from ${context.url}/${path} with params: ${params}`, error);
    throw error;
  }
};

/** @internal */
export const postResource = (path: string) => (context: RemoteDataContext) => async <T>(
  body: Record<string, unknown>,
): Promise<T> => requestWithBody(context, path, body, 'POST');

/** @internal */
export const putResource = (path: string) => (context: RemoteDataContext) => async <T>(
  body: Identifiable,
): Promise<T> => requestWithBody(context, `${path}/${body._id}`, body, 'PUT');

const requestWithBody = async <T>(
  context: RemoteDataContext,
  path: string,
  body: Record<string, unknown>,
  method: string
): Promise<T> => {
  try {
    const response = await fetch(`${context.url}/${path}`, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    if (response.status === 400) {
      const errorMessage = await response.text();
      throw new InvalidArgumentError(errorMessage);
    } else if (!response.ok) {
      throw new Error(response.statusText);
    }

    return (await response.json()) as T;
  } catch (error) {
    logger.error(`Failed to ${method} ${JSON.stringify(body)} to ${context.url}/${path}.`, error);
    throw error;
  }
};
