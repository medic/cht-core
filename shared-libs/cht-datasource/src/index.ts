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
 * // Or
 * const getPerson = dataContext.bind(Person.v1.get);
 *
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
import { Nullable } from './libs/core';
import { assertDataContext, DataContext } from './libs/data-context';
import * as Person from './person';
import * as Place from './place';
import * as Qualifier from './qualifier';

export { Nullable, NonEmptyArray } from './libs/core';
export { DataContext } from './libs/data-context';
export { getLocalDataContext } from './local';
export { getRemoteDataContext } from './remote';
export { InvalidArgumentError } from './libs/error';
export * as Person from './person';
export * as Place from './place';
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
      place: {
        /**
         * Returns a place by its UUID.
         * @param uuid the UUID of the place to retrieve
         * @returns the place or `null` if no place is found for the UUID
         * @throws Error if no UUID is provided
         */
        getByUuid: (uuid: string) => ctx.bind(Place.v1.get)(Qualifier.byUuid(uuid)),

        /**
         * Returns a place by its UUID along with the place's parent lineage.
         * @param uuid the UUID of the place to retrieve
         * @returns the place or `null` if no place is found for the UUID
         * @throws Error if no UUID is provided
         */
        getByUuidWithLineage: (uuid: string) => ctx.bind(Place.v1.getWithLineage)(Qualifier.byUuid(uuid)),

        /**
         * Returns an array of places for the provided page specifications.
         * @param placeType the type of place to return
         * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
         * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
         * @param limit the maximum number of place to return. Default is 100.
         * @returns a page of places for the provided specifications
         * @throws InvalidArgumentError if no type is provided or if the type is not for a place
         * @throws InvalidArgumentError if the provided limit is `<= 0`
         * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
         * @see {@link getByType} which provides the same data, but without having to manually account for paging
         */
        getPageByType: (
          placeType: string,
          cursor: Nullable<string> = null,
          limit = 100
        ) => ctx.bind(Place.v1.getPage)(
          Qualifier.byContactType(placeType), cursor, limit
        ),

        /**
         * Returns a generator for fetching all places with the given type.
         * @param placeType the type of place to return
         * @returns a generator for fetching all places with the given type
         * @throws InvalidArgumentError if no type if provided or if the type is not for a place
         */
        getByType: (placeType: string) => ctx.bind(Place.v1.getAll)(Qualifier.byContactType(placeType))
      },
      person: {
        /**
         * Returns a person by their UUID.
         * @param uuid the UUID of the person to retrieve
         * @returns the person or `null` if no person is found for the UUID
         * @throws Error if no UUID is provided
         */
        getByUuid: (uuid: string) => ctx.bind(Person.v1.get)(Qualifier.byUuid(uuid)),

        /**
         * Returns a person by their UUID along with the person's parent lineage.
         * @param uuid the UUID of the person to retrieve
         * @returns the person or `null` if no person is found for the UUID
         * @throws Error if no UUID is provided
         */
        getByUuidWithLineage: (uuid: string) => ctx.bind(Person.v1.getWithLineage)(Qualifier.byUuid(uuid)),

        /**
         * Returns an array of people for the provided page specifications.
         * @param personType the type of people to return
         * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
         * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
         * @param limit the maximum number of people to return. Default is 100.
         * @returns a page of people for the provided specifications
         * @throws InvalidArgumentError if no type is provided or if the type is not for a person
         * @throws InvalidArgumentError if the provided limit is `<= 0`
         * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
         * @see {@link getByType} which provides the same data, but without having to manually account for paging
         */
        getPageByType: (
          personType: string,
          cursor: Nullable<string> = null,
          limit = 100
        ) => ctx.bind(Person.v1.getPage)(
          Qualifier.byContactType(personType), cursor, limit
        ),

        /**
         * Returns a generator for fetching all people with the given type.
         * @param personType the type of people to return
         * @returns a generator for fetching all people with the given type
         * @throws InvalidArgumentError if no type is provided or if the type is not for a person
         */
        getByType: (personType: string) => ctx.bind(Person.v1.getAll)(Qualifier.byContactType(personType)),
      }
    }
  };
};
