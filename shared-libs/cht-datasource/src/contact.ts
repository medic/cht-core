import { Doc } from './libs/doc';
import { DataObject, Identifiable, isDataObject, isIdentifiable } from './libs/core';
import { isUuidQualifier, UuidQualifier } from './qualifier';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import { LocalDataContext } from './local/libs/data-context';
import { RemoteDataContext } from './remote/libs/data-context';
import { InvalidArgumentError } from './libs/error';
import * as Local from './local';
import * as Remote from './remote';

/** */
export namespace v1 {
  /** @internal */
  export interface NormalizedParent extends DataObject, Identifiable {
    readonly parent?: NormalizedParent;
  }

  /** @internal */
  export const isNormalizedParent = (value: unknown): value is NormalizedParent => {
    return isDataObject(value) && isIdentifiable(value) && (!value.parent || isNormalizedParent(value.parent));
  };

  /**
   * Immutable data about a Contact.
   */
  export interface Contact extends Doc, NormalizedParent {
    readonly contact_type?: string;
    readonly name?: string;
    readonly reported_date?: Date;
    readonly type: string;
  }

  /**
   * Immutable data about a contact, including the full records of the parent's lineage.
   */
  export interface ContactWithLineage extends Contact {
    readonly parent?: ContactWithLineage | NormalizedParent;
  }

  const assertContactQualifier: (qualifier: unknown) => asserts qualifier is UuidQualifier = (qualifier: unknown) => {
    if (!isUuidQualifier(qualifier)) {
      throw new InvalidArgumentError(`Invalid identifier [${JSON.stringify(qualifier)}].`);
    }
  };

  const getContact = <T>(
    localFn: (c: LocalDataContext) => (qualifier: UuidQualifier) => Promise<T>,
    remoteFn: (c: RemoteDataContext) => (qualifier: UuidQualifier) => Promise<T>
  ) => (context: DataContext) => {
      assertDataContext(context);
      const fn = adapt(context, localFn, remoteFn);
      return async (qualifier: UuidQualifier): Promise<T> => {
        assertContactQualifier(qualifier);
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

  // New REST api: /api/v1/contact/id
  /**
   * Returns a function for retrieving a paged array of contact identifiers from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a paged array of contact identifiers
   * @throws Error if a data context is not provided
   * @see {@link getIdsAll} which provides the same data, but without having to manually account for paging
   */
  /**
   * Returns an array of contact identifiers for the provided page specifications.
   * @param qualifier the limiter defining which identifiers to return
   * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
   * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
   * @param limit the maximum number of identifiers to return. Default is 10000.
   * @returns a page of contact identifiers for the provided specification
   * @throws Error if no qualifier is provided or if the qualifier is invalid
   * @throws Error if the provided `limit` value is `<=0`
   * @throws Error if the provided cursor is not a valid page token or `null`
   */
  // const getIdsPage = (context: DataContext) => (
  //   qualifier: ContactTypeQualifier | FreetextQualifier,
  //   cursor: Nullable<string>, limit: number
  // ) => Promise<Page<string>>;

  /**
   * Returns a function for getting a generator that fetches contact identifiers from the given data context.
   * @param context the current data context
   * @returns a function for getting a generator that fetches contact identifiers
   * @throws Error if a data context is not provided
   */
  /**
   * Returns a generator for fetching all contact identifiers that match the given qualifier
   * @param qualifier the limiter defining which identifiers to return
   * @returns a generator for fetching all contact identifiers that match the given qualifier
   * @throws Error if no qualifier is provided or if the qualifier is invalid
   */
  // const getIdsAll = (context: DataContext) => (
  //   qualifier: ContactTypeQualifier | FreetextQualifier
  // ) => AsyncGenerator<string, null>;
}
