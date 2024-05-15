/**
 * CHT Script API - Index
 * Builds and exports a versioned API from feature modules.
 * Whenever possible keep this file clean by defining new features in modules.
 */
import { hasAnyPermission, hasPermissions } from './auth';
import { assertDataContext, DataContext } from './libs/context';
import * as Person from './person';
import * as Qualifier from './qualifier';

export { Nullable, NonEmptyArray } from './libs/core';
export { DataContext, getLocalDataContext, getRemoteDataContext } from './libs/context';
export * as Person from './person';
export * as Qualifier from './qualifier';

/**
 * Returns the source for CHT data.
 * @param ctx the current data context
 * @returns the CHT datasource API
 */
export const getDatasource = (ctx: DataContext) => {
  assertDataContext(ctx);
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
