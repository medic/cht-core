import { ContactSummary as LibContactSummary } from '@medic/summaries';
import {
  getPagedGenerator, NormalizedParent,
  Nullable,
  Page,
} from './libs/core';
import {
  and,
  byContactType,
  byFreetext,
  byIds,
  byUuid,
  ContactTypeQualifier,
  FreetextQualifier,
  IdsQualifier,
  UuidQualifier
} from './qualifier';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import { LocalDataContext } from './local/libs/data-context';
import { validateCursor } from './local/libs/core';
import { RemoteDataContext } from './remote/libs/data-context';
import * as Local from './local';
import * as Remote from './remote';
import { DEFAULT_DOCS_PAGE_LIMIT, DEFAULT_IDS_PAGE_LIMIT } from './libs/constants';
import {
  assertContactTypeFreetextQualifier,
  assertContactTypeIdsQualifier,
  assertCursor,
  assertLimit,
  assertUuidQualifier,
  assertIdsQualifier,
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

  /**
   * A compact summary of a contact record.
   */
  export type ContactSummary = LibContactSummary;

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
   * Returns a function for retrieving a paged array of contact summaries from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a paged array of contact summaries
   * @throws Error if a data context is not provided
   * @see {@link getSummaries} which provides the same data, but without having to manually account for paging
   */
  export const getSummariesPage = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Contact.v1.getSummaries, Remote.Contact.v1.getSummaries);

    /**
     * Returns a page of summary records for the contacts identified by the given qualifier. Any identifiers that do
     * not identify an existing contact are silently omitted from the result.
     * @param qualifier the identifiers of the contacts to summarise
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of summaries to return. Default is 100.
     * @returns a page of contact summaries for the provided specification
     * @throws InvalidArgumentError if the qualifier does not contain an array of non-empty identifier strings
     * @throws InvalidArgumentError if the provided `limit` value is `<=0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    const curriedFn = async (
      qualifier: IdsQualifier,
      cursor: Nullable<string> = null,
      limit: number | `${number}` = DEFAULT_DOCS_PAGE_LIMIT
    ): Promise<Page<ContactSummary>> => {
      assertCursor(cursor);
      assertLimit(limit);
      assertIdsQualifier(qualifier);

      const skip = validateCursor(cursor);
      const numberLimit = Number(limit);
      const data = await fn({ ids: qualifier.ids.slice(skip, skip + numberLimit) });
      const nextSkip = skip + numberLimit;
      return {
        data,
        cursor: nextSkip < qualifier.ids.length ? `${nextSkip}` : null,
      };
    };
    return curriedFn;
  };

  /**
   * Returns a function for getting a generator that fetches contact summaries from the given data context.
   * @param context the current data context
   * @returns a function for getting a generator that fetches contact summaries
   * @throws Error if a data context is not provided
   */
  export const getSummaries = (context: DataContext): typeof curriedGen => {
    assertDataContext(context);
    const getPage = context.bind(v1.getSummariesPage);

    /**
     * Returns a generator for fetching summary records for the contacts identified by the given qualifier. Any
     * identifiers that do not identify an existing contact are silently omitted from the result.
     * @param qualifier the identifiers of the contacts to summarise
     * @returns a generator for fetching all the matching contact summaries
     * @throws InvalidArgumentError if the qualifier does not contain an array of non-empty identifier strings
     */
    const curriedGen = (qualifier: IdsQualifier): AsyncGenerator<ContactSummary, null> => {
      assertIdsQualifier(qualifier);

      return getPagedGenerator(getPage, qualifier);
    };
    return curriedGen;
  };

  /**
   * Returns a function for retrieving a paged array of contact identifiers from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a paged array of contact identifiers
   * @throws Error if a data context is not provided
   * @see {@link getUuids} which provides the same data, but without having to manually account for paging
   */
  export const getUuidsPage = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Contact.v1.getUuidsPage, Remote.Contact.v1.getUuidsPage);

    /**
     * Returns an array of contact identifiers for the provided page specifications.
     * @param qualifier the limiter defining which identifiers to return
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of identifiers to return. Default is 10000.
     * @returns a page of contact identifiers for the provided specification
     * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
     * @throws InvalidArgumentError if the provided `limit` value is `<=0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    const curriedFn = async (
      qualifier: ContactTypeQualifier | FreetextQualifier,
      cursor: Nullable<string> = null,
      limit: number | `${number}` = DEFAULT_IDS_PAGE_LIMIT
    ): Promise<Page<string>> => {
      assertCursor(cursor);
      assertLimit(limit);
      assertContactTypeFreetextQualifier(qualifier);

      return fn(qualifier, cursor, Number(limit));
    };
    return curriedFn;
  };

  /**
   * Returns a function for getting a generator that fetches contact identifiers from the given data context.
   * @param context the current data context
   * @returns a function for getting a generator that fetches contact identifiers
   * @throws Error if a data context is not provided
   */
  export const getUuids = (context: DataContext): typeof curriedGen => {
    assertDataContext(context);
    const getPage = context.bind(v1.getUuidsPage);

    /**
     * Returns a generator for fetching all contact identifiers that match the given qualifier
     * @param qualifier the limiter defining which identifiers to return
     * @returns a generator for fetching all contact identifiers that match the given qualifier
     * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
     */
    const curriedGen = (
      qualifier: ContactTypeQualifier | FreetextQualifier
    ): AsyncGenerator<string, null> => {
      assertContactTypeFreetextQualifier(qualifier);

      return getPagedGenerator(getPage, qualifier);
    };
    return curriedGen;
  };

  /**
   * Returns a function for retrieving a paged array of contacts from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a paged array of contacts
   * @throws Error if a data context is not provided
   * @see {@link getAll} which provides the same data, but without having to manually account for paging
   */
  export const getPage = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Contact.v1.getPage, Remote.Contact.v1.getPage);

    /**
     * Returns an array of contacts for the provided page specifications.
     * @param qualifier the limiter defining which contacts to return (a contact type or a set of UUIDs)
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of contacts to return. Default is 100.
     * @returns a page of contacts for the provided specification
     * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
     * @throws InvalidArgumentError if the provided `limit` value is `<=0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    const curriedFn = async (
      qualifier: ContactTypeQualifier | IdsQualifier,
      cursor: Nullable<string> = null,
      limit: number | `${number}` = DEFAULT_DOCS_PAGE_LIMIT
    ): Promise<Page<v1.Contact>> => {
      assertContactTypeIdsQualifier(qualifier);
      assertCursor(cursor);
      assertLimit(limit);

      return fn(qualifier, cursor, Number(limit));
    };
    return curriedFn;
  };

  /**
   * Returns a function for getting a generator that fetches contacts from the given data context.
   * @param context the current data context
   * @returns a function for getting a generator that fetches contacts
   * @throws Error if a data context is not provided
   */
  export const getAll = (context: DataContext): typeof curriedGen => {
    assertDataContext(context);
    const getPage = context.bind(v1.getPage);

    /**
     * Returns a generator for fetching all contacts that match the given qualifier.
     * @param qualifier the limiter defining which contacts to return (a contact type or a set of UUIDs)
     * @returns a generator for fetching all contacts that match the given qualifier
     * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
     */
    const curriedGen = (
      qualifier: ContactTypeQualifier | IdsQualifier
    ): AsyncGenerator<v1.Contact, null> => {
      assertContactTypeIdsQualifier(qualifier);

      return getPagedGenerator(getPage, qualifier);
    };
    return curriedGen;
  };

  /**
   * Operations for working with contacts.
   */
  export interface Datasource {
    /**
     * Returns a generator for fetching summary records for the given contact identifiers.
     * @param ids the identifiers of the contacts to summarise
     * @returns a generator for fetching all the matching contact summaries. Identifiers that do not identify an
     * existing contact are silently omitted from the result.
     * @throws InvalidArgumentError if `ids` is not an array of non-empty strings
     */
    getSummaries: (ids: string[]) => AsyncGenerator<ContactSummary, null>;

    /**
     * Returns a paged array of summary records for the given contact identifiers.
     * @param ids the identifiers of the contacts to summarise
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of summaries to return. Default is 100.
     * @returns a page of contact summaries. Identifiers that do not identify an existing contact are silently
     * omitted from the result.
     * @throws InvalidArgumentError if `ids` is not an array of non-empty strings
     * @throws InvalidArgumentError if the provided `limit` value is `<=0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    getSummariesPage: (
      ids: string[],
      cursor?: Nullable<string>,
      limit?: number | `${number}`
    ) => Promise<Page<ContactSummary>>;

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

    /**
     * Returns a page of contacts for the given type.
     * @param type the type of contacts to return
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of contacts to return. Default is 100.
     * @returns a page of contacts for the provided type
     * @throws InvalidArgumentError if no type is provided or if the type is invalid for a contact
     * @throws InvalidArgumentError if the provided limit is `<= 0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    getPageByType: (
      type: string,
      cursor?: Nullable<string>,
      limit?: number | `${number}`
    ) => Promise<Page<v1.Contact>>;

    /**
     * Returns a generator for fetching all contacts of the given type.
     * @param type the type of contacts to return
     * @returns a generator for fetching all contacts of the given type
     * @throws InvalidArgumentError if no type is provided or if the type is invalid for a contact
     */
    getByType: (type: string) => AsyncGenerator<v1.Contact, null>;

    /**
     * Returns a page of contacts for the given ids.
     * @param ids the ids of the contacts to return
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of contacts to return. Default is 100.
     * @returns a page of contacts for the provided ids
     * @throws InvalidArgumentError if no ids are provided
     * @throws InvalidArgumentError if the provided limit is `<= 0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    getPageByIds: (
      ids: [string, ...string[]],
      cursor?: Nullable<string>,
      limit?: number | `${number}`
    ) => Promise<Page<v1.Contact>>;

    /**
     * Returns a generator for fetching all contacts with the given ids.
     * @param ids the ids of the contacts to return
     * @returns a generator for fetching all contacts with the given ids
     * @throws InvalidArgumentError if no ids are provided
     */
    getByIds: (ids: [string, ...string[]]) => AsyncGenerator<v1.Contact, null>;
  }

  /** @internal */
  export const getDatasource = (ctx: DataContext): Datasource => {
    return {
      getSummaries: (ids) => ctx.bind(v1.getSummaries)(byIds(ids)),
      getSummariesPage: (
        ids,
        cursor = null,
        limit = DEFAULT_DOCS_PAGE_LIMIT
      ) => ctx.bind(v1.getSummariesPage)(byIds(ids), cursor, limit),
      getByUuid: (uuid) => ctx.bind(v1.get)(byUuid(uuid)),
      getByUuidWithLineage: (uuid) => ctx.bind(v1.getWithLineage)(byUuid(uuid)),
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
      getPageByType: (
        type,
        cursor = null,
        limit = DEFAULT_DOCS_PAGE_LIMIT
      ) => ctx.bind(v1.getPage)(byContactType(type), cursor, limit),
      getByType: (type) => ctx.bind(v1.getAll)(byContactType(type)),
      getPageByIds: (
        ids,
        cursor = null,
        limit = DEFAULT_DOCS_PAGE_LIMIT
      ) => ctx.bind(v1.getPage)(byIds(ids), cursor, limit),
      getByIds: (ids) => ctx.bind(v1.getAll)(byIds(ids)),
    };
  };
}
