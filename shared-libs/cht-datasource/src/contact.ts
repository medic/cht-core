import {
  assertCursor,
  assertFreetextQualifier,
  assertLimit,
  assertTypeQualifier,
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
import { DEFAULT_CONTACT_PAGE_LIMIT } from './libs/constants';

/** */
export namespace v1 {
  /** @internal */
  export type NormalizedParent = ContactTypes.v1.NormalizedParent;
  /**
   * Immutable data about a Contact.
   */
  export type Contact = ContactTypes.v1.Contact;
  /**
   * Immutable data about a contact, including the full records of the parent's lineage.
   */
  export type ContactWithLineage = ContactTypes.v1.ContactWithLineage;

  /** @ignore */
  export const createQualifier = ContactTypes.v1.createQualifier;

  const getContact =
    <T>(
      localFn: (c: LocalDataContext) => (qualifier: UuidQualifier) => Promise<T>,
      remoteFn: (c: RemoteDataContext) => (qualifier: UuidQualifier) => Promise<T>
    ) => (context: DataContext) => {
      assertDataContext(context);
      const fn = adapt(context, localFn, remoteFn);
      return async (qualifier: UuidQualifier): Promise<T> => {
        ContactTypes.v1.assertContactQualifier(qualifier);
        return fn(qualifier);
      };
    };

  /**
   * Returns a function for retrieving a contact from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a contact
   * @throws Error if a data context is not provided
   */
  /**
   * Returns a contact for the given qualifier.
   * @param qualifier identifier for the contact to retrieve
   * @returns the contact or `null` if no contact is found for the qualifier
   * @throws Error if the qualifier is invalid
   */
  export const get = getContact(Local.Contact.v1.get, Remote.Contact.v1.get);

  /**
   * Returns a function for retrieving a contact from the given data context with the contact's parent lineage.
   * @param context the current data context
   * @returns a function for retrieving a contact with the contact's parent lineage
   * @throws Error if a data context is not provided
   */
  /**
   * Returns a contact for the given qualifier with the contact's parent lineage.
   * @param qualifier identifier for the contact to retrieve
   * @returns the contact or `null` if no contact is found for the qualifier
   * @throws Error if the qualifier is invalid
   */
  export const getWithLineage = getContact(Local.Contact.v1.getWithLineage, Remote.Contact.v1.getWithLineage);

  /**
   * Returns a function for retrieving a paged array of contact identifiers from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a paged array of contact identifiers
   * @throws Error if a data context is not provided
   * @see {@link getIds} which provides the same data, but without having to manually account for paging
   */
  export const getIdsPage = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Contact.v1.getPage, Remote.Contact.v1.getPage);

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
      limit: number | `${number}` = DEFAULT_CONTACT_PAGE_LIMIT
    ): Promise<Page<string>> => {
      assertCursor(cursor);
      assertLimit(limit);

      if (ContactTypes.v1.isContactType(qualifier)) {
        assertTypeQualifier(qualifier);
      }

      if (ContactTypes.v1.isFreetextType(qualifier)) {
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
  export const getIds = (context: DataContext): typeof curriedGen => {
    assertDataContext(context);
    const getPage = context.bind(v1.getIdsPage);

    /**
     * Returns a generator for fetching all contact identifiers that match the given qualifier
     * @param qualifier the limiter defining which identifiers to return
     * @returns a generator for fetching all contact identifiers that match the given qualifier
     * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
     */
    const curriedGen = (
      qualifier: ContactTypeQualifier | FreetextQualifier
    ): AsyncGenerator<string, null> => {
      if (ContactTypes.v1.isContactType(qualifier)) {
        assertTypeQualifier(qualifier);
      }

      if (ContactTypes.v1.isFreetextType(qualifier)) {
        assertFreetextQualifier(qualifier);
      }
      return getPagedGenerator(getPage, qualifier);
    };
    return curriedGen;
  };
}
