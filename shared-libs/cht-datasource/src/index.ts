/**
 * CHT Script API - Index
 * Builds and exports a versioned API from feature modules.
 * Whenever possible keep this file clean by defining new features in modules.
 */
import { hasAnyPermission, hasPermissions } from './auth';
import { getDataContext as _getDataContext, SourceDatabases } from './libs/context';
import * as Person from './person';
import * as Qualifier from './qualifier';

export { Nullable, NonEmptyArray } from './libs/core';
export const getDataContext = _getDataContext;
export * as Person from './person';
export * as Qualifier from './qualifier';

/**
 * Returns the source for CHT data. If local source databases are provided, these will be used to interact with the
 * data. This functionality is intended for use cases requiring offline functionality. For all other use cases, no
 * source databases should be provided and instead the library will use the remote API to interact with the data.
 * @param sourceDatabases the PouchDB databases to use as the local datasource. Required for offline functionality.
 * @returns the CHT datasource API
 */
export const getDatasource = async (sourceDatabases?: SourceDatabases) => {
  const ctx = await getDataContext(sourceDatabases);
  return {
    v1: {
      hasPermissions,
      hasAnyPermission,
      person: {
        /**
         * Returns a person by their UUID.
         * @param uuid the UUID of the person to retrieve
         * @returns the person or <code>null</code> if no person is found for the UUID
         */
        getByUuid: (uuid: string) => Person.V1.get(ctx)(Qualifier.byUuid(uuid)),
      }
    }
  };
};

