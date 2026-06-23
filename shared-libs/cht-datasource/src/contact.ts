import {
  NormalizedParent,
  Nullable,
  Page,
} from './libs/core';
import {
  and,
  byContactType,
  byFreetext,
  byIds,
  byUuid,
  UuidQualifier
} from './qualifier';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import { getGeneratorFn, getPagedDataFn } from './libs/paginated';
import { LocalDataContext } from './local/libs/data-context';
import { RemoteDataContext } from './remote/libs/data-context';
import * as Local from './local';
import * as Remote from './remote';
import { DEFAULT_DOCS_PAGE_LIMIT, DEFAULT_IDS_PAGE_LIMIT } from './libs/constants';
import {
  assertContactTypeFreetextQualifier,
  assertOptionalIdsQualifier,
  assertUuidQualifier,
} from './libs/parameter-validators';
import { Doc } from './libs/doc';

/** */
export namespace v1 {
  /**
   * Immutable data about a Contact.
   */
  export interface Contact extends Doc, NormalizedParent {
    readonly contact_type?: string;
    readonly name?: string;
    readonly reported_date?: number;
    readonly type: string;
  }

  /**
   * Immutable data about a contact, including the full records of the parent's lineage.
   */
  export interface ContactWithLineage extends Contact {
    readonly parent?: ContactWithLineage | NormalizedParent;
  }

  const getContact =
    <T>(
      localFn: (c: LocalDataContext) => (qualifier: UuidQualifier) => Promise<T>,
      remoteFn: (c: RemoteDataContext) => (qualifier: UuidQualifier) => Promise<T>
    ) => (context: DataContext): typeof curriedFn => {
      assertDataContext(context);
      const fn = adapt(context, localFn, remoteFn);

      /**
       * Returns the contact with the given identifier.
       * @param qualifier the limiter defining which contact to return
       * @returns the contact with the given identifier
       * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
       */
      const curriedFn = async (qualifier: UuidQualifier): Promise<T> => {
        assertUuidQualifier(qualifier);
        return fn(qualifier);
      };
      return curriedFn;
    };

  /**
   * Returns a function for retrieving a contact from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a contact
   * @throws Error if a data context is not provided
   */
  export const get = getContact(Local.Contact.v1.get, Remote.Contact.v1.get);

  /**
   * Returns a function for retrieving a contact from the given data context with the contact's parent lineage.
   * @param context the current data context
   * @returns a function for retrieving a contact with the contact's parent lineage
   * @throws Error if a data context is not provided
   */
  export const getWithLineage = getContact(Local.Contact.v1.getWithLineage, Remote.Contact.v1.getWithLineage);

  /**
   * Returns a function for retrieving a paged array of contact identifiers from the given data context.
   *
   * The returned function accepts a `ContactTypeQualifier` and/or `FreetextQualifier`, an optional page `cursor`
   * (`null` for the first page) and an optional `limit` (default 10000), and resolves a page of contact identifiers.
   * @param context the current data context
   * @returns a function for retrieving a paged array of contact identifiers
   * @throws Error if a data context is not provided
   * @see {@link getUuids} which provides the same data, but without having to manually account for paging
   */
  export const getUuidsPage = getPagedDataFn({
    localFn: Local.Contact.v1.getUuidsPage,
    remoteFn: Remote.Contact.v1.getUuidsPage,
    assertQualifier: assertContactTypeFreetextQualifier,
    defaultLimit: DEFAULT_IDS_PAGE_LIMIT,
  });

  /**
   * Returns a function for getting a generator that fetches contact identifiers from the given data context.
   * @param context the current data context
   * @returns a function for getting a generator that fetches contact identifiers
   * @throws Error if a data context is not provided
   */
  export const getUuids = getGeneratorFn({
    pagedFn: v1.getUuidsPage,
    assertQualifier: assertContactTypeFreetextQualifier,
  });

  /**
   * Returns a function for retrieving a paged array of contacts from the given data context.
   *
   * The returned function accepts an optional `IdsQualifier`, an optional page `cursor` (`null` for the first page)
   * and an optional `limit` (default 100), and resolves a page of contacts. When an `IdsQualifier` is provided, only
   * the contacts with the given UUIDs are returned (in UUID order); when no qualifier is provided, all contacts are
   * returned. Use the typed {@link https://docs.communityhealthtoolkit.org | Person} / Place pages to filter by
   * contact type.
   * @param context the current data context
   * @returns a function for retrieving a paged array of contacts
   * @throws Error if a data context is not provided
   * @see {@link getAll} which provides the same data, but without having to manually account for paging
   */
  export const getPage = getPagedDataFn({
    localFn: Local.Contact.v1.getPage,
    remoteFn: Remote.Contact.v1.getPage,
    assertQualifier: assertOptionalIdsQualifier,
    defaultLimit: DEFAULT_DOCS_PAGE_LIMIT,
  });

  /**
   * Returns a function for getting a generator that fetches contacts from the given data context. When an
   * `IdsQualifier` is provided, only the contacts with the given UUIDs are fetched; when no qualifier is provided, all
   * contacts are fetched.
   * @param context the current data context
   * @returns a function for getting a generator that fetches contacts
   * @throws Error if a data context is not provided
   */
  export const getAll = getGeneratorFn({
    pagedFn: v1.getPage,
    assertQualifier: assertOptionalIdsQualifier,
  });

  /**
   * Operations for working with contacts.
   */
  export interface Datasource {
    /**
     * Returns a contact by their UUID.
     * @param uuid the UUID of the contact to retrieve
     * @returns the contact or `null` if no contact is found for the UUID
     * @throws InvalidArgumentError if no UUID is provided
     */
    getByUuid: (uuid: string) => Promise<Nullable<v1.Contact>>;

    /**
     * Returns a contact by their UUID along with the contact's parent lineage.
     * @param uuid the UUID of the contact to retrieve
     * @returns the contact or `null` if no contact is found for the UUID
     * @throws InvalidArgumentError if no UUID is provided
     */
    getByUuidWithLineage: (uuid: string) => Promise<Nullable<v1.ContactWithLineage>>;

    /**
     * Returns a page of contacts for the provided UUIDs.
     * @param ids the UUIDs of the contacts to retrieve
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of contacts to return. Default is 100.
     * @returns a page of contacts for the provided UUIDs
     * @throws InvalidArgumentError if no UUIDs are provided or if any of the UUIDs is invalid
     * @throws InvalidArgumentError if the provided limit is `<= 0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    getPageByIds: (
      ids: string[],
      cursor?: Nullable<string>,
      limit?: number | `${number}`
    ) => Promise<Page<v1.Contact>>;

    /**
     * Returns a page of all contacts.
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of contacts to return. Default is 100.
     * @returns a page of contacts
     * @throws InvalidArgumentError if the provided limit is `<= 0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    getPage: (
      cursor?: Nullable<string>,
      limit?: number | `${number}`
    ) => Promise<Page<v1.Contact>>;

    /**
     * Returns a generator for fetching all the contacts with the given UUIDs.
     * @param ids the UUIDs of the contacts to retrieve
     * @returns a generator for fetching all the contacts with the given UUIDs
     * @throws InvalidArgumentError if no UUIDs are provided or if any of the UUIDs is invalid
     */
    getByIds: (ids: string[]) => AsyncGenerator<v1.Contact, null>;

    /**
     * Returns a generator for fetching all contacts.
     * @returns a generator for fetching all contacts
     */
    getAll: () => AsyncGenerator<v1.Contact, null>;

    /**
     * Returns an array of contact identifiers for the provided page specifications, freetext and type.
     * @param freetext the search keyword(s)
     * @param type the type of contact to search for
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of identifiers to return. Default is 10000.
     * @returns a page of contact identifiers for the provided specifications
     * @throws InvalidArgumentError if either `freetext` or `type` is not provided
     * @throws InvalidArgumentError if the `freetext` is empty or if the `type` is invalid for a contact
     * @throws InvalidArgumentError if the provided limit is `<= 0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    getUuidsPageByTypeFreetext: (
      freetext: string,
      type: string,
      cursor?: Nullable<string>,
      limit?: number | `${number}`
    ) => Promise<Page<string>>;

    /**
     * Returns an array of contact identifiers for the provided page specifications and type.
     * @param type the type of contact to search for
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of identifiers to return. Default is 10000.
     * @returns a page of contact identifiers for the provided specifications
     * @throws InvalidArgumentError if `type` is not provided
     * @throws InvalidArgumentError if the `type` is invalid for a contact
     * @throws InvalidArgumentError if the provided limit is `<= 0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    getUuidsPageByType: (
      type: string,
      cursor?: Nullable<string>,
      limit?: number | `${number}`
    ) => Promise<Page<string>>;

    /**
     * Returns an array of contact identifiers for the provided page specifications and freetext.
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
      cursor?: Nullable<string>,
      limit?: number | `${number}`
    ) => Promise<Page<string>>;

    /**
     * Returns a generator for fetching all the contact identifiers for given `freetext` and `type`.
     * @param freetext the search keyword(s)
     * @param type the type of contact identifiers to return
     * @returns a generator for fetching all the contact identifiers matching the given `freetext` and `type`.
     * @throws InvalidArgumentError if either `freetext` or `type` is not provided
     * @throws InvalidArgumentError if the `freetext` is empty or if the `type` is invalid for a contact
     */
    getUuidsByTypeFreetext: (freetext: string, type: string) => AsyncGenerator<string, null>;

    /**
     * Returns a generator for fetching all the contact identifiers for given `type`.
     * @param type the type of contact identifiers to return
     * @returns a generator for fetching all the contact identifiers matching the given `type`.
     * @throws InvalidArgumentError if `type` is not provided
     * @throws InvalidArgumentError if the `type` is invalid for a contact
     */
    getUuidsByType: (type: string) => AsyncGenerator<string, null>;

    /**
     * Returns a generator for fetching all the contact identifiers for given `freetext`.
     * @param freetext the search keyword(s)
     * @returns a generator for fetching all the contact identifiers matching the given `freetext`.
     * @throws InvalidArgumentError if `freetext`is not provided
     * @throws InvalidArgumentError if the `freetext` is empty or invalid
     */
    getUuidsByFreetext: (freetext: string) => AsyncGenerator<string, null>;
  }

  /** @internal */
  export const getDatasource = (ctx: DataContext): Datasource => {
    return {
      getByUuid: (uuid) => ctx.bind(v1.get)(byUuid(uuid)),
      getByUuidWithLineage: (uuid) => ctx.bind(v1.getWithLineage)(byUuid(uuid)),
      getPageByIds: (
        ids,
        cursor = null,
        limit = DEFAULT_DOCS_PAGE_LIMIT
      ) => ctx.bind(v1.getPage)(byIds(ids), cursor, limit),
      getPage: (
        cursor = null,
        limit = DEFAULT_DOCS_PAGE_LIMIT
      ) => ctx.bind(v1.getPage)(undefined, cursor, limit),
      getByIds: (ids) => ctx.bind(v1.getAll)(byIds(ids)),
      getAll: () => ctx.bind(v1.getAll)(),
      getUuidsPageByTypeFreetext: (
        freetext,
        type,
        cursor = null,
        limit = DEFAULT_IDS_PAGE_LIMIT
      ) => ctx.bind(v1.getUuidsPage)(and(byFreetext(freetext), byContactType(type)), cursor, limit),
      getUuidsPageByType: (
        type,
        cursor = null,
        limit = DEFAULT_IDS_PAGE_LIMIT
      ) => ctx.bind(v1.getUuidsPage)(byContactType(type), cursor, limit),
      getUuidsPageByFreetext: (
        freetext,
        cursor = null,
        limit = DEFAULT_IDS_PAGE_LIMIT
      ) => ctx.bind(v1.getUuidsPage)(byFreetext(freetext), cursor, limit),
      getUuidsByTypeFreetext: (freetext, type) => ctx.bind(v1.getUuids)(
        and(byFreetext(freetext), byContactType(type))
      ),
      getUuidsByType: (type) => ctx.bind(v1.getUuids)(byContactType(type)),
      getUuidsByFreetext: (freetext) => ctx.bind(v1.getUuids)(byFreetext(freetext)),
    };
  };
}
