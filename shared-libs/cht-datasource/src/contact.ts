import {
  getPagedGenerator,
  Nullable,
  Page,
} from './libs/core';
import {
  ContactTypeQualifier,
  FreetextQualifier,
  UuidQualifier
} from './qualifier';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import { LocalDataContext } from './local/libs/data-context';
import { RemoteDataContext } from './remote/libs/data-context';
import * as Local from './local';
import * as Remote from './remote';
import * as ContactTypes from './contact-types';
import { DEFAULT_DOCS_PAGE_LIMIT } from './libs/constants';
import {
  assertContactTypeFreetextQualifier,
  assertCursor,
  assertFreetextQualifier,
  assertLimit,
  assertTypeQualifier,
  assertUuidQualifier,
  isContactType,
  isFreetextType,
} from './libs/parameter-validators';

/** */
export namespace v1 {
  /**
   * Immutable data about a Contact.
   */
  export type Contact = ContactTypes.v1.Contact;
  /**
   * Immutable data about a contact, including the full records of the parent's lineage.
   */
  export type ContactWithLineage = ContactTypes.v1.ContactWithLineage;

  const getContact =
    <T>(
      localFn: (c: LocalDataContext) => (qualifier: UuidQualifier) => Promise<T>,
      remoteFn: (c: RemoteDataContext) => (qualifier: UuidQualifier) => Promise<T>
    ) => (context: DataContext) => {
      assertDataContext(context);
      const fn = adapt(context, localFn, remoteFn);
      return async (qualifier: UuidQualifier): Promise<T> => {
        assertUuidQualifier(qualifier);
        return fn(qualifier);
      };
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
     * @throws InvalidArrgumentError if no qualifier is provided or if the qualifier is invalid
     * @throws InvalidArgumentError if the provided `limit` value is `<=0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    const curriedFn = async (
      qualifier: ContactTypeQualifier | FreetextQualifier,
      cursor: Nullable<string> = null,
      limit: number | `${number}` = DEFAULT_DOCS_PAGE_LIMIT
    ): Promise<Page<string>> => {
      assertCursor(cursor);
      assertLimit(limit);

      if (isContactType(qualifier) && isFreetextType(qualifier)) {
        assertContactTypeFreetextQualifier(qualifier);
      } else if (isContactType(qualifier)) {
        assertTypeQualifier(qualifier);
      } else if (isFreetextType(qualifier)) {
        assertFreetextQualifier(qualifier);
      }

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
      if (isContactType(qualifier) && isFreetextType(qualifier)) {
        assertContactTypeFreetextQualifier(qualifier);
      } else if (isContactType(qualifier)) {
        assertTypeQualifier(qualifier);
      } else if (isFreetextType(qualifier)) {
        assertFreetextQualifier(qualifier);
      }

      return getPagedGenerator(getPage, qualifier);
    };
    return curriedGen;
  };
}
