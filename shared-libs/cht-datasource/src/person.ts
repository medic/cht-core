import { ContactTypeQualifier, isUuidQualifier, UuidQualifier } from './qualifier';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import { Contact, NormalizedParent } from './libs/contact';
import * as Remote from './remote';
import * as Local from './local';
import * as Place from './place';
import { LocalDataContext } from './local/libs/data-context';
import { RemoteDataContext } from './remote/libs/data-context';
import { InvalidArgumentError } from './libs/error';
import { assertCursor, assertLimit, assertTypeQualifier, getPagedGenerator, Nullable, Page } from './libs/core';

/** */
export namespace v1 {
  /**
   * Immutable data about a person contact.
   */
  export interface Person extends Contact {
    readonly date_of_birth?: Date;
    readonly phone?: string;
    readonly patient_id?: string;
    readonly sex?: string;
  }

  /**
   * Immutable data about a person contact, including the full records of the parent place lineage.
   */
  export interface PersonWithLineage extends Person {
    readonly parent?: Place.v1.PlaceWithLineage | NormalizedParent,
  }

  const assertPersonQualifier: (qualifier: unknown) => asserts qualifier is UuidQualifier = (qualifier: unknown) => {
    if (!isUuidQualifier(qualifier)) {
      throw new InvalidArgumentError(`Invalid identifier [${JSON.stringify(qualifier)}].`);
    }
  };

  const getPerson = <T>(
    localFn: (c: LocalDataContext) => (qualifier: UuidQualifier) => Promise<T>,
    remoteFn: (c: RemoteDataContext) => (qualifier: UuidQualifier) => Promise<T>
  ) => (context: DataContext) => {
      assertDataContext(context);
      const fn = adapt(context, localFn, remoteFn);
      return async (qualifier: UuidQualifier): Promise<T> => {
        assertPersonQualifier(qualifier);
        return fn(qualifier);
      };
    };

  /**
   * Returns a person for the given qualifier.
   * @param context the current data context
   * @returns the person or `null` if no person is found for the qualifier
   * @throws Error if the provided context or qualifier is invalid
   */
  export const get = getPerson(Local.Person.v1.get, Remote.Person.v1.get);

  /**
   * Returns a person for the given qualifier with the person's parent lineage.
   * @param context the current data context
   * @returns the person or `null` if no person is found for the qualifier
   * @throws Error if the provided context or qualifier is invalid
   */
  export const getWithLineage = getPerson(Local.Person.v1.getWithLineage, Remote.Person.v1.getWithLineage);

  /**
   * Returns a function for retrieving a paged array of people from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a paged array of people
   * @throws Error if a data context is not provided
   * @see {@link getAll} which provides the same data, but without having to manually account for paging
   */
  export const getPage = (
    context: DataContext
  ): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Person.v1.getPage, Remote.Person.v1.getPage);

    /**
     * Returns an array of people for the provided page specifications.
     * @param personType the type of people to return
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of people to return. Default is 100.
     * @returns a page of people for the provided specification
     * @throws Error if no type is provided or if the type is not for a person
     * @throws Error if the provided `limit` value is `<=0`
     * @throws Error if the provided cursor is not a valid page token or `null`
     */
    const curriedFn = async (
      personType: ContactTypeQualifier,
      cursor: Nullable<string> = null,
      limit = 100,
    ): Promise<Page<Person>> => {
      assertTypeQualifier(personType);
      assertCursor(cursor);
      assertLimit(limit);

      return fn(personType, cursor, limit);
    };
    return curriedFn;
  };

  /**
   * Returns a function for getting a generator that fetches people from the given data context.
   * @param context the current data context
   * @returns a function for getting a generator that fetches people
   * @throws Error if a data context is not provided
   */
  export const getAll = (
    context: DataContext
  ): typeof curriedGen => {
    assertDataContext(context);
    const getPage = context.bind(v1.getPage);

    /**
     * Returns a generator for fetching all people with the given type
     * @param personType the type of people to return
     * @returns a generator for fetching all people with the given type
     * @throws Error if no type is provided or if the type is not for a person
     */
    const curriedGen = (personType: ContactTypeQualifier): AsyncGenerator<Person, null> => {
      assertTypeQualifier(personType);
      return getPagedGenerator(getPage, personType);
    };
    return curriedGen;
  };
}
