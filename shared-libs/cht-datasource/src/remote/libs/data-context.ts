import { DataContext } from '../../libs/context';

/**
 * Returns the data context based on a remote CHT API server. This function should not be used when offline
 * functionality is required.
 * @returns the data context
 */
export const getRemoteDataContext = (): DataContext => {
  // TODO Need to determine what initial arguments are needed for the remote data context (e.g. session cookie...)
  return {};
};
