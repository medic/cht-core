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
import * as Contact from './contact';
import * as Person from './person';
import * as Place from './place';
import * as Qualifier from './qualifier';
import * as Report from './report';
import {
  DEFAULT_DOCS_PAGE_LIMIT,
  DEFAULT_IDS_PAGE_LIMIT,
} from './libs/constants';

export { Nullable, NonEmptyArray } from './libs/core';
export { DataContext } from './libs/data-context';
export { getLocalDataContext } from './local';
export { getRemoteDataContext } from './remote';
export { InvalidArgumentError } from './libs/error';
export * as Contact from './contact';
export * as Person from './person';
export * as Place from './place';
export * as Qualifier from './qualifier';
export * as Report from './report';

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
      contact: {
        /**
         * Returns a contact by their UUID.
         * @param uuid the UUID of the contact to retrieve
         * @returns the contact or `null` if no contact is found for the UUID
         * @throws InvalidArgumentError if no UUID is provided
         */
        getByUuid: (uuid: string) => ctx.bind(Contact.v1.get)(Qualifier.byUuid(uuid)),

        /**
         * Returns a contact by their UUID along with the contact's parent lineage.
         * @param uuid the UUID of the contact to retrieve
         * @returns the contact or `null` if no contact is found the UUID
         * @throws InvalidArgumentError if no UUID is provided
         */
        getByUuidWithLineage: (uuid: string) => ctx.bind(Contact.v1.getWithLineage)(Qualifier.byUuid(uuid)),

        /**
         * Returns an array of contact identifiers for the provided page specifications,
         * freetext and type
         * @param freetext the search keyword(s)
         * @param type the type of contact to search for
         * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
         * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
         * @param limit the maximum number of identifiers to return. Default is 10000.
         * @returns a page of contact identifiers for the provided specifications
         * @throws InvalidArgumentError if either `freetext` or `type` is not provided
         * @throws InvalidArgumentError if the `freetext` is empty or if the `type is invalid for a contact
         * @throws InvalidArgumentError if the provided limit is `<= 0`
         * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
         */
        getUuidsPageByTypeFreetext: (
          freetext: string,
          type: string,
          cursor: Nullable<string> = null,
          limit: number | `${number}` = DEFAULT_IDS_PAGE_LIMIT
        ) => ctx.bind(Contact.v1.getUuidsPage)(
          Qualifier.and(Qualifier.byFreetext(freetext), Qualifier.byContactType(type)), cursor, limit
        ),

        /**
         * Returns an array of contact identifiers for the provided page specifications and type.
         * @param type the type of contact to search for
         * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
         * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
         * @param limit the maximum number of identifiers to return. Default is 10000.
         * @returns a page of contact identifiers for the provided specifications
         * @throws InvalidArgumentError if `type` is not provided
         * @throws InvalidArgumentError if the `type is invalid for a contact
         * @throws InvalidArgumentError if the provided limit is `<= 0`
         * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
         */
        getUuidsPageByType: (
          type: string,
          cursor: Nullable<string> = null,
          limit: number | `${number}` = DEFAULT_IDS_PAGE_LIMIT
        ) => ctx.bind(Contact.v1.getUuidsPage)(
          Qualifier.byContactType(type), cursor, limit
        ),

        /**
         * Returns an array of contact identifiers for the provided page specifications and freetext
         * @param freetext the search keyword(s)
         * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
         * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
         * @param limit the maximum number of identifiers to return. Default is 10000.
         * @returns a page of contact identifiers for the provided specifications
         * @throws InvalidArgumentError if `freetext` is not provided
         * @throws InvalidArgumentError if the `freetext` is less than 3 characters long or if it contains white-space
         * @throws InvalidArgumentError if the provided limit is `<= 0`
         * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
         */
        getUuidsPageByFreetext: (
          freetext: string,
          cursor: Nullable<string> = null,
          limit: number | `${number}` = DEFAULT_IDS_PAGE_LIMIT
        ) => ctx.bind(Contact.v1.getUuidsPage)(
          Qualifier.byFreetext(freetext), cursor, limit
        ),

        /**
         * Returns a generator for fetching all the contact identifiers for given
         * `freetext` and `type`.
         * @param freetext the search keyword(s)
         * @param type the type of contact identifiers to return
         * @returns a generator for fetching all the contact identifiers matching the given `freetext` and `type`.
         * @throws InvalidArgumentError if either `freetext` or `type` is not provided
         * @throws InvalidArgumentError if the `freetext` is empty or if the `type is invalid for a contact
         */
        getUuidsByTypeFreetext: (
          freetext: string,
          type: string
        ) => ctx.bind(Contact.v1.getUuids)(
          Qualifier.and(Qualifier.byFreetext(freetext), Qualifier.byContactType(type))
        ),

        /**
         * Returns a generator for fetching all the contact identifiers for given `type`.
         * @param type the type of contact identifiers to return
         * @returns a generator for fetching all the contact identifiers matching the given `type`.
         * @throws InvalidArgumentError if `type` is not provided
         * @throws InvalidArgumentError if the `type is invalid for a contact
         */
        getUuidsByType: (
          type: string
        ) => ctx.bind(Contact.v1.getUuids)(
          Qualifier.byContactType(type)
        ),

        /**
         * Returns a generator for fetching all the contact identifiers for given
         * `freetext`.
         * @param freetext the search keyword(s)
         * @returns a generator for fetching all the contact identifiers matching the given `freetext`.
         * @throws InvalidArgumentError if `freetext`is not provided
         * @throws InvalidArgumentError if the `freetext` is empty or invalid
         */
        getUuidsByFreetext: (
          freetext: string,
        ) => ctx.bind(Contact.v1.getUuids)(
          Qualifier.byFreetext(freetext)
        ),
      },
      place: {
        /**
         * Returns a place by its UUID.
         * @param uuid the UUID of the place to retrieve
         * @returns the place or `null` if no place is found for the UUID
         * @throws InvalidArgumentError if no UUID is provided
         */
        getByUuid: (uuid: string) => ctx.bind(Place.v1.get)(Qualifier.byUuid(uuid)),

        /**
         * Returns a place by its UUID along with the place's parent lineage.
         * @param uuid the UUID of the place to retrieve
         * @returns the place or `null` if no place is found for the UUID
         * @throws InvalidArgumentError if no UUID is provided
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
          limit: number | `${number}` = DEFAULT_DOCS_PAGE_LIMIT
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
         * @throws InvalidArgumentError if no UUID is provided
         */
        getByUuid: (uuid: string) => ctx.bind(Person.v1.get)(Qualifier.byUuid(uuid)),

        /**
         * Returns a person by their UUID along with the person's parent lineage.
         * @param uuid the UUID of the person to retrieve
         * @returns the person or `null` if no person is found for the UUID
         * @throws InvalidArgumentError if no UUID is provided
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
          limit: number | `${number}` = DEFAULT_DOCS_PAGE_LIMIT
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
      },
      report: {
        /**
         * Returns a report by their UUID.
         * @param uuid the UUID of the report to retrieve
         * @returns the report or `null` if no report is found for the UUID
         * @throws InvalidArgumentError if no UUID is provided
         */
        getByUuid: (uuid: string) => ctx.bind(Report.v1.get)(Qualifier.byUuid(uuid)),

        /**
         * Returns a paged array of report identifiers from the given data context.
         * @param qualifier the limiter defining which identifiers to return
         * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
         * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
         * @param limit the maximum number of identifiers to return. Default is 10000.
         * @returns a page of report identifiers for the provided specification
         * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
         * @throws InvalidArgumentError if the provided `limit` value is `<=0`
         * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
         */
        getUuidsPageByFreetext: (
          qualifier: string,
          cursor: Nullable<string> = null,
          limit: number | `${number}` = DEFAULT_IDS_PAGE_LIMIT
        ) => ctx.bind(Report.v1.getUuidsPage)(
          Qualifier.byFreetext(qualifier), cursor, limit
        ),

        /**
         * Returns a generator for fetching all the contact identifiers for given qualifier
         * @param qualifier the limiter defining which identifiers to return
         * @returns a generator for fetching all report identifiers that match the given qualifier
         * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
         */
        getUuidsByFreetext: (
          qualifier: string,
        ) => ctx.bind(Report.v1.getUuids)(Qualifier.byFreetext(qualifier)),
      },
    },
  };
};
