/**
 * CHT datasource.
 *
 * This module provides a simple API for interacting with CHT data. To get started, obtain a {@link DataContext}. Then
 * use the context to perform data operations. There are two different usage modes available for performing the same
 * operations.
 * @example Get Data Context:
 * import { getRemoteDataContext, getLocalDataContext } from '@medic/cht-datasource';
 *
 * const dataContext = isOnlineOnly
 *   ? getRemoteDataContext(...)
 *   : getLocalDataContext(...);
 * @example Declarative usage mode:
 * import { Person, Qualifier } from '@medic/cht-datasource';
 *
 * const getPerson = Person.v1.get(dataContext);
 * const myUuid = 'my-uuid';
 * const myPerson = await getPerson(Qualifier.byUuid(uuid));
 * @example Imperative usage mode:
 * import { getDatasource } from '@medic/cht-datasource';
 *
 * const datasource = getDatasource(dataContext);
 * const myUuid = 'my-uuid';
 * const myPerson = await datasource.v1.person.getByUuid(myUuid);
 */
import { hasAnyPermission, hasPermissions } from './auth';
import { assertDataContext, DataContext } from './libs/data-context';
import * as Person from './person';
import * as Qualifier from './qualifier';

export { Nullable, NonEmptyArray } from './libs/core';
export { DataContext } from './libs/data-context';
export { getLocalDataContext } from './local';
export { getRemoteDataContext } from './remote';
export * as Person from './person';
export * as Qualifier from './qualifier';

/**
 * Returns the source for CHT data.
 * @param ctx the current data context
 * @returns the CHT datasource API
 * @throws Error if the provided context is invalid
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
         * @returns the person or `null` if no person is found for the UUID
         */
        getByUuid: (uuid: string) => Person.v1.get(ctx)(Qualifier.byUuid(uuid)),
      }
    }
  };
};
