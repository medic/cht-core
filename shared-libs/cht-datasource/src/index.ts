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
import { DEFAULT_DOCS_PAGE_LIMIT, DEFAULT_IDS_PAGE_LIMIT, } from './libs/constants';
import * as Input from './input';

export { Nullable, NonEmptyArray } from './libs/core';
export { DataContext } from './libs/data-context';
export { getLocalDataContext } from './local';
export { getRemoteDataContext } from './remote';
export { InvalidArgumentError, ResourceNotFoundError } from './libs/error';
export * as Contact from './contact';
export * as Person from './person';
export * as Place from './place';
export * as Qualifier from './qualifier';
export * as Input from './input';
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
         * @returns the contact or `null` if no contact is found for the UUID
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
        getByType: (placeType: string) => ctx.bind(Place.v1.getAll)(Qualifier.byContactType(placeType)),

        /**
         * Creates a new place record.
         * @param input input fields for creating a place
         * @returns the created place record
         * @throws InvalidArgumentError if `type` is not provided or is not a supported place contact type
         * @throws InvalidArgumentError if `name` is not provided
         * @throws InvalidArgumentError if `parent` is not provided or is not the identifier of a valid contact. The
         * parent contact's type must be one of the supported parent contact types for the new place.
         * @throws InvalidArgumentError if the provided `reported_date` is not in a valid format. Valid formats are
         * 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or <unix epoch>.
         * @throws InvalidArgumentError if the provided `contact` is not the identifier of a valid person contact
         */
        create: (input: Input.v1.PlaceInput) => ctx.bind(Place.v1.create)(input),

        /**
         * Updates an existing place to have the provided data.
         * @param updated the updated place data. The complete data for the place must be provided. Existing fields not
         * included in the updated data will be removed from the place. If the provided parent/contact lineage is
         * hydrated (e.g. for a {@link PlaceWithLineage}), the lineage will be properly dehydrated before being stored.
         * @returns the updated place with the new `_rev` value
         * @throws InvalidArgumentError if `_id` is not provided
         * @throws ResourceNotFoundError if `_id does not identify an existing place contact
         * @throws InvalidArgumentError if `_rev` is not provided or does not match the place's current `_rev` value
         * @throws InvalidArgumentError if `name` is not provided
         * @throws InvalidArgumentError if the provided `contact` is not the identifier of a valid person contact
         * @throws InvalidArgumentError if any of the following read-only properties are changed: `reported_date`,
         * `parent`, `type`, `contact_type`
         */
        update: <T extends Place.v1.Place | Place.v1.PlaceWithLineage>(
          updated: Input.v1.UpdatePlaceInput<T>
        ) => ctx.bind(Place.v1.update)(updated)
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

        /**
         * Creates a new person record.
         * @param input input fields for creating a person
         * @returns the created person record
         * @throws InvalidArgumentError if `type` is not provided or is not a supported person contact type
         * @throws InvalidArgumentError if `name` is not provided
         * @throws InvalidArgumentError if `parent` is not provided or is not the identifier of a valid contact. The
         * parent contact's type must be one of the supported parent contact types for the new person.
         * @throws InvalidArgumentError if the provided `reported_date` is not in a valid format. Valid formats are
         * 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or <unix epoch>.
         */
        create: (input: Input.v1.PersonInput) => ctx.bind(Person.v1.create)(input),

        /**
         * Updates an existing person to have the provided data.
         * @param updated the updated person data. The complete data for the person must be provided. Existing fields
         * not included in the updated data will be removed from the person. If the provided parent lineage is
         * hydrated (e.g. for a {@link PersonWithLineage}), the lineage will be properly dehydrated before being stored.
         * @returns the updated person with the new `_rev` value
         * @throws InvalidArgumentError if `_id` is not provided
         * @throws ResourceNotFoundError if `_id does not identify an existing person contact
         * @throws InvalidArgumentError if `_rev` is not provided or does not match the person's current `_rev` value
         * @throws InvalidArgumentError if `name` is not provided
         * @throws InvalidArgumentError if any of the following read-only properties are changed: `reported_date`,
         * `parent`, `type`, `contact_type`
         */
        update: <T extends Person.v1.Person | Person.v1.PersonWithLineage>(
          updated: T
        ) => ctx.bind(Person.v1.update)(updated)
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
         * Returns a report by UUID along with the report's lineage information.
         * @param uuid the UUID of the report to retrieve
         * @returns the report or `null` if no report is found for the UUID
         * @throws InvalidArgumentError if no UUID is provided
         */
        getByUuidWithLineage: (uuid: string) => ctx.bind(Report.v1.getWithLineage)(Qualifier.byUuid(uuid)),

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

        /**
         * Creates a new report record.
         * @param input input fields for creating a report
         * @returns the created report record
         * @throws InvalidArgumentError if `form` is not provided or is not a supported form id
         * @throws InvalidArgumentError if `contact` is not provided or is not the identifier of a valid contact
         * @throws InvalidArgumentError if the provided `reported_date` is not in a valid format. Valid formats are
         * 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or <unix epoch>.
         */
        create: (input: Input.v1.ReportInput) => ctx.bind(Report.v1.create)(input),

        /**
         * Updates an existing report to have the provided data.
         * @param updated the updated report data. The complete data for the report must be provided. Existing fields
         * not included in the updated data will be removed from the report. If the provided parent/patient/place
         * lineage is hydrated (e.g. for a {@link ReportWithLineage}), the lineage will be properly dehydrated before
         * being stored.
         * @returns the updated report with the new `_rev` value
         * @throws InvalidArgumentError if `_id` is not provided
         * @throws ResourceNotFoundError if `_id does not identify an existing report
         * @throws InvalidArgumentError if `_rev` is not provided or does not match the report's current `_rev` value
         * @throws InvalidArgumentError if `form` is not provided or is not a supported form id
         * @throws InvalidArgumentError if `contact` is not provided or is not a valid contact
         * @throws InvalidArgumentError if any of the following read-only properties are changed: `reported_date`,
         * `type`
         */
        update: <T extends Report.v1.Report | Report.v1.ReportWithLineage>(
          updated: T
        ) => ctx.bind(Report.v1.update)(updated)
      },
    },
  };
};
